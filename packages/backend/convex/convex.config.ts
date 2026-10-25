import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import resend from "@convex-dev/resend/convex.config.js";
import { defineApp } from "convex/server";
import { v } from "convex/values";
import betterAuth from "./betterAuth/convex.config";

const app = defineApp({
	env: {
		SITE_URL: v.optional(v.string()),
		PASSKEY_RP_ID: v.optional(v.string()),
		PASSKEY_RP_NAME: v.optional(v.string()),
		RESEND_API_KEY: v.optional(v.string()),
		RESEND_FROM: v.optional(v.string()),
		OTP_DELIVERY: v.optional(v.string()),
	},
});
app.use(betterAuth);
app.use(rateLimiter);
app.use(resend);
export default app;
