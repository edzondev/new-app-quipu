import { convexTest } from "convex-test";
import { componentsGeneric, defineSchema } from "convex/server";
import { expect, test, vi } from "vitest";
import betterAuthTest from "@convex-dev/better-auth/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import authConfig from "../convex/auth.config";
import app from "../convex/convex.config";

vi.mock("@convex-dev/rate-limiter/convex.config.js", () => ({
	default: {
		componentDefinitionPath: "@convex-dev/rate-limiter",
		defaultName: "rateLimiter",
	},
}));
vi.mock("@convex-dev/resend/convex.config.js", () => ({
	default: {
		componentDefinitionPath: "@convex-dev/resend",
		defaultName: "resend",
	},
}));
vi.mock("convex/server", async (importOriginal) => {
	const actual = await importOriginal<typeof import("convex/server")>();
	return {
		...actual,
		defineApp: (options?: Parameters<typeof actual.defineApp>[0]) => {
			const creado = actual.defineApp(options);
			const registro = creado as unknown as {
				use: (
					definition: {
						componentDefinitionPath?: string;
						defaultName?: string;
						_name?: string;
					},
					...args: unknown[]
				) => unknown;
			};
			const usar = registro.use.bind(creado);
			// Fuera del runtime de Convex el componente local no trae
			// componentDefinitionPath, así que use() tira antes de poder leer el registro.
			registro.use = (definition) => {
				const nombre = definition.defaultName ?? definition._name ?? "component";
				return usar({
					...definition,
					componentDefinitionPath: definition.componentDefinitionPath ?? `local/${nombre}`,
					defaultName: nombre,
				});
			};
			return creado;
		},
	};
});

test("Convex confía en el JWT de Better Auth", () => {
	expect(authConfig.providers).toHaveLength(1);
	const proveedor = authConfig.providers[0];
	expect(proveedor.type).toBe("customJwt");
	expect(proveedor.algorithm).toBe("RS256");
	expect(proveedor.applicationID).toBe("convex");
});

const registrar = {
	betterAuth: betterAuthTest.register,
	rateLimiter: rateLimiterTest.register,
	resend: resendTest.register,
} as const;

test("los componentes de convex.config responden en convex-test", async () => {
	const nombres = (
		app as unknown as { _childComponents: [string, ...unknown[]][] }
	)._childComponents.map(([nombre]) => nombre);
	expect(nombres).toEqual(["betterAuth", "rateLimiter", "resend"]);

	const modules = import.meta.glob("../convex/**/*.ts");
	const t = convexTest(defineSchema({}), modules);
	for (const nombre of nombres) {
		registrar[nombre as keyof typeof registrar](t, nombre);
	}

	const betterAuth = componentsGeneric().betterAuth as unknown as {
		adapter: {
			findOne: Parameters<typeof t.query>[0];
		};
	};
	const fila = await t.query(betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: "nadie@correo.com" }],
	});
	expect(fila).toBeNull();
});
