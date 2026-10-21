import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth";
import { isRunMutationCtx } from "@convex-dev/better-auth/utils";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";
import { enviarCodigo } from "./lib/correo";
import { assertEmailAllowed } from "./lib/domainPolicy";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
	authFunctions,
	local: { schema: authSchema },
	// Los triggers se agregan en el Paso 8 (perfil)
});

export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
	({
		baseURL: siteUrl,
		trustedOrigins: [siteUrl],
		database: authComponent.adapter(ctx),
		emailAndPassword: { enabled: false }, // sin contraseñas
		disabledPaths: [
			"/email-otp/request-password-reset",
			"/forget-password/email-otp",
			"/email-otp/reset-password",
			"/email-otp/request-email-change",
		],
		hooks: {
			before: createAuthMiddleware(async (actx) => {
				if (actx.path !== "/email-otp/send-verification-otp") return;
				const email = String(actx.body?.email ?? "")
					.trim()
					.toLowerCase();
				try {
					assertEmailAllowed(email);
				} catch {
					throw new APIError("BAD_REQUEST", {
						code: "EMAIL_NOT_ALLOWED",
						message: "No podemos registrar cuentas con ese dominio de correo.",
					});
				}
				if (!isRunMutationCtx(ctx)) {
					throw APIError.from("BAD_REQUEST", {
						code: "SIN_CONTEXTO",
						message: "Intenta de nuevo.",
					});
				}
				const reserva = await ctx.runMutation(internal.limites.reservarEnvioDeCodigo, {
					email,
				});
				if (!reserva.ok) {
					throw APIError.from("TOO_MANY_REQUESTS", {
						code: "ESPERA_REENVIO",
						message: String(Math.ceil(reserva.esperaMs / 1000)),
					});
				}
				if (actx.headers?.get("x-quipu-intencion") === "entrar") {
					const existe = await actx.context.internalAdapter.findUserByEmail(email);
					if (!existe) return { success: true };
				}
			}),
		},
		plugins: [
			convex({ authConfig }),
			emailOTP({
				otpLength: 6,
				expiresIn: 600, // 10 minutos
				allowedAttempts: 3,
				storeOTP: "hashed", // se guarda cifrado
				// resendStrategy queda en "rotate" (por defecto): el código nuevo invalida al anterior
				sendVerificationOTP: async ({ email, otp }) => {
					await enviarCodigo(ctx, { email, otp });
				},
			}),
		],
	}) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth(createAuthOptions(ctx));
export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();
