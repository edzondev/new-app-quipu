import { expect, test } from "vitest";
import authConfig from "../convex/auth.config";

test("Convex confía en el JWT de Better Auth", () => {
	expect(authConfig.providers).toHaveLength(1);
	const proveedor = authConfig.providers[0];
	expect(proveedor.type).toBe("customJwt");
	expect(proveedor.algorithm).toBe("RS256");
	expect(proveedor.applicationID).toBe("convex");
});
