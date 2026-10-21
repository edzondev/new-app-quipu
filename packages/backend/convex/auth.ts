import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";
import { enviarCodigo } from "./lib/correo";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
// shortcut: internal.auth y components.betterAuth no existen hasta `convex codegen`,
// y codegen pide un deployment. Quitar los casts cuando exista.
const authFunctions: AuthFunctions = (internal as unknown as { auth: AuthFunctions }).auth;

export const authComponent = createClient<DataModel, typeof authSchema>(
	(components as unknown as { betterAuth: Parameters<typeof createClient>[0] }).betterAuth,
	{
		authFunctions,
		local: { schema: authSchema },
		// Los triggers se agregan en el Paso 8 (perfil)
	},
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
	({
		baseURL: siteUrl,
		trustedOrigins: [siteUrl],
		database: authComponent.adapter(ctx),
		emailAndPassword: { enabled: false }, // sin contraseñas
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
