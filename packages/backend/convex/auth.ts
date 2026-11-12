import { passkey } from "@better-auth/passkey";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { Resend } from "@convex-dev/resend";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins";

import { DELETION_CODE_TYPE } from "../shared/deletion";
import { components, internal } from "./_generated/api";
import { env } from "./_generated/server";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";
import { OTP_EXPIRES_IN_MINUTES, otpEmail } from "./emails/otp";

import type { DataModel } from "./_generated/dataModel";
import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth";

// App env is present at push; the betterAuth component isolate that imports this file does not see it.
const polarServer = process.env.POLAR_SERVER;
if (polarServer) {
	if (env.OTP_DELIVERY === "log" && polarServer === "production") {
		throw new Error("OTP_DELIVERY=log no se puede con POLAR_SERVER=production");
	}
	if (env.OTP_DELIVERY !== "log" && !env.RESEND_API_KEY) {
		throw new Error("Falta RESEND_API_KEY");
	}
}

export const resend = new Resend(components.resend, { testMode: false });

export const siteUrl = env.SITE_URL;
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

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
	// Placeholder only for betterAuth component analyze (no app env there). Deploy still requires SITE_URL.
	const baseURL = process.env.SITE_URL ?? "http://localhost:3000";
	const rpID = env.PASSKEY_RP_ID ?? new URL(baseURL).hostname;
	return {
		baseURL,
		trustedOrigins: [baseURL],
		database: authComponent.adapter(ctx),
		emailAndPassword: { enabled: false }, // no passwords
		disabledPaths: [
			"/email-otp/request-password-reset",
			"/forget-password/email-otp",
			"/email-otp/reset-password",
			"/email-otp/check-verification-otp",
			"/email-otp/verify-email",
		],
		hooks: {
			// Before Better Auth replaces the previous code with a new one.
			before: createAuthMiddleware(async (authCtx) => {
				if (authCtx.path !== "/email-otp/send-verification-otp") return;
				// HTTP only: auth.api (requestCode, etc.) has no request and may send other types.
				if (authCtx.request && authCtx.body?.type !== "sign-in") {
					throw new APIError("BAD_REQUEST");
				}
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
				origin: [baseURL],
				authenticatorSelection: {
					residentKey: "preferred",
					userVerification: "preferred",
				},
			}),
			emailOTP({
				otpLength: 6,
				expiresIn: OTP_EXPIRES_IN_MINUTES * 60,
				allowedAttempts: 3,
				storeOTP: "hashed",
				sendVerificationOTP: async ({ email, otp, type }) => {
					if (env.OTP_DELIVERY === "log") {
						console.log(`OTP ${email}: ${otp}`);
						return;
					}
					if (!("runMutation" in ctx)) throw new Error("OTP solo se envía desde una acción");

					const { subject, html, text } = otpEmail({
						otp,
						email,
						deletion: type === DELETION_CODE_TYPE,
					});
					await resend.sendEmail(ctx, { from: env.RESEND_FROM, to: email, subject, html, text });
				},
			}),
		],
	} satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth(createAuthOptions(ctx));
export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();
