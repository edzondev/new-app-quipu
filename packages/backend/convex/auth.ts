import { passkey } from "@better-auth/passkey";
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
import { correo } from "../shared/validaciones";
import { enviarCodigo } from "./lib/correo";
import { assertEmailAllowed } from "./lib/domainPolicy";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
const rpID = process.env.PASSKEY_RP_ID ?? new URL(siteUrl).hostname;
const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
	authFunctions,
	local: { schema: authSchema },
	triggers: {
		user: {
			onCreate: async (ctx, user) => {
				await ctx.db.insert("perfiles", {
					userId: user._id,
					nombre: user.name,
					pasoActual: "paso-1",
					creadoEn: Date.now(),
				});
			},
		},
	},
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
				let email = "";
				try {
					email = correo.parse(actx.body?.email);
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
				if (actx.body?.type !== "sign-in") {
					throw new APIError("BAD_REQUEST", {
						code: "TIPO_INVALIDO",
						message: "Ese envío no está permitido.",
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
			passkey({
				rpID,
				rpName: process.env.PASSKEY_RP_NAME ?? "Quipu",
				origin: [siteUrl],
				authenticatorSelection: {
					residentKey: "preferred",
					userVerification: "preferred",
				},
			}),
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
