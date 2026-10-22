import { passkey } from "@better-auth/passkey";
import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { isRunMutationCtx } from "@convex-dev/better-auth/utils";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins";
import { email } from "../shared/validation";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { env } from "./_generated/server";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";
import { assertEmailAllowed } from "./lib/domainPolicy";
import { sendCode } from "./lib/email";

const siteUrl = env.SITE_URL ?? "http://localhost:3000";
const rpID = env.PASSKEY_RP_ID ?? new URL(siteUrl).hostname;
const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
	authFunctions,
	local: { schema: authSchema },
	triggers: {
		user: {
			onCreate: async (ctx, user) => {
				await ctx.db.insert("profiles", {
					userId: user._id,
					name: user.name,
					currentStep: "step-1",
					createdAt: Date.now(),
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
		emailAndPassword: { enabled: false }, // no passwords
		disabledPaths: [
			"/email-otp/request-password-reset",
			"/forget-password/email-otp",
			"/email-otp/reset-password",
			"/email-otp/request-email-change",
		],
		hooks: {
			before: createAuthMiddleware(async (actx) => {
				if (actx.path !== "/email-otp/send-verification-otp") return;
				let address = "";
				try {
					address = email.parse(actx.body?.email);
					assertEmailAllowed(address);
				} catch {
					throw new APIError("BAD_REQUEST", {
						code: "EMAIL_NOT_ALLOWED",
						message: "We cannot register accounts with that email domain.",
					});
				}
				if (!isRunMutationCtx(ctx)) {
					throw APIError.from("BAD_REQUEST", {
						code: "NO_CONTEXT",
						message: "Try again.",
					});
				}
				if (actx.body?.type !== "sign-in") {
					throw new APIError("BAD_REQUEST", {
						code: "INVALID_TYPE",
						message: "That send type is not allowed.",
					});
				}
				const reservation = await ctx.runMutation(internal.rateLimits.reserveCodeSend, {
					email: address,
				});
				if (!reservation.ok) {
					throw APIError.from("TOO_MANY_REQUESTS", {
						code: "WAIT_TO_RESEND",
						message: String(Math.ceil(reservation.waitMs / 1000)),
					});
				}
				if (actx.headers?.get("x-quipu-intent") === "sign-in") {
					const exists = await actx.context.internalAdapter.findUserByEmail(address);
					if (!exists) return { success: true };
				}
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
				expiresIn: 600, // 10 minutes
				allowedAttempts: 3,
				storeOTP: "hashed", // stored hashed
				// resendStrategy stays "rotate" (default): a new code invalidates the previous one
				sendVerificationOTP: async ({ email: address, otp }) => {
					await sendCode(ctx, { email: address, otp });
				},
			}),
		],
	}) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth(createAuthOptions(ctx));
export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();
