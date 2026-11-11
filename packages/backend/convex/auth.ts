import { passkey } from "@better-auth/passkey";
import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { Resend } from "@convex-dev/resend";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { env } from "./_generated/server";
import { DELETION_CODE_TYPE } from "../shared/deletion";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";

export const resend = new Resend(components.resend, { testMode: false });

export const siteUrl = env.SITE_URL ?? "http://localhost:3000";
const rpID = env.PASSKEY_RP_ID ?? new URL(siteUrl).hostname;
const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
	authFunctions,
	local: { schema: authSchema },
	triggers: {
		user: {
			onCreate: async (ctx, user) => {
				const existing = await ctx.db
					.query("profiles")
					.withIndex("by_userId", (q) => q.eq("userId", user._id))
					.unique();
				if (existing) return;
				await ctx.db.insert("profiles", { userId: user._id });
			},
			onDelete: async (ctx, user) => {
				const profile = await ctx.db
					.query("profiles")
					.withIndex("by_userId", (q) => q.eq("userId", user._id))
					.unique();
				if (profile) await ctx.db.delete("profiles", profile._id);
			},
		},
	},
});

export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
	({
		baseURL: siteUrl,
		trustedOrigins: [siteUrl],
		database: authComponent.adapter(ctx),
		emailAndPassword: { enabled: false }, // no passwords
		hooks: {
			// Before Better Auth replaces the previous code with a new one.
			before: createAuthMiddleware(async (authCtx) => {
				if (authCtx.path !== "/email-otp/send-verification-otp") return;
				if (!("runMutation" in ctx)) throw new Error("OTP solo se envía desde una acción");
				const email = String(authCtx.body?.email ?? "")
					.trim()
					.toLowerCase();
				const { ok } = await ctx.runMutation(internal.rateLimits.reserveCodeSend, { email });
				if (!ok) throw new APIError("TOO_MANY_REQUESTS");
			}),
		},
		plugins: [
			convex({ authConfig }),
			passkey({
				rpID,
				rpName: env.PASSKEY_RP_NAME ?? "Quipu",
				origin: [siteUrl],
				authenticatorSelection: {
					residentKey: "preferred",
					userVerification: "preferred",
				},
			}),
			emailOTP({
				otpLength: 6,
				allowedAttempts: 3,
				storeOTP: "hashed",
				sendVerificationOTP: async ({ email, otp, type }) => {
					if (env.OTP_DELIVERY === "log") {
						console.log(`OTP ${email}: ${otp}`);
						return;
					}
					if (!("runMutation" in ctx)) throw new Error("OTP solo se envía desde una acción");
					if (!env.RESEND_FROM) throw new Error("Falta RESEND_FROM");

					const deletion = type === DELETION_CODE_TYPE;
					await resend.sendEmail(ctx, {
						from: env.RESEND_FROM,
						to: email,
						subject: deletion ? "Código para eliminar tu cuenta de Quipu" : "Tu código de Quipu",
						text: deletion
							? `Tu código es ${otp}. Vence en 5 minutos. Si no fuiste tú, no lo compartas con nadie.`
							: `Tu código es ${otp}. Vence en 5 minutos.`,
					});
				},
			}),
		],
	}) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth(createAuthOptions(ctx));
export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();
