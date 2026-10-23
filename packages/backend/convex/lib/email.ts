import type { GenericCtx } from "@convex-dev/better-auth";
import { isRunMutationCtx } from "@convex-dev/better-auth/utils";
import { Resend } from "@convex-dev/resend";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { env } from "../_generated/server";
import { codeEmail } from "./emailTemplate";

export async function sendCode(
	ctx: GenericCtx<DataModel>,
	{ email, otp }: { email: string; otp: string },
) {
	const apiKey = env.RESEND_API_KEY;
	if (!apiKey) {
		if (!isLocalBackend()) throw new Error("Missing RESEND_API_KEY");
		console.log(`[dev] Code for ${email}: ${otp}`);
		return;
	}
	if (!isRunMutationCtx(ctx)) throw new Error("Could not send the code");
	const resend = new Resend(components.resend, { testMode: false, apiKey });
	const { subject, html, text } = codeEmail(otp);
	return await resend.sendEmail(ctx, {
		from: env.RESEND_FROM ?? "Quipu <hola@quipu-finance.app>",
		to: email,
		subject,
		html,
		text,
	});
}

// CONVEX_CLOUD_URL is set by the Convex runtime, not convex.config.ts.
function isLocalBackend() {
	const url = env.CONVEX_CLOUD_URL ?? "";
	try {
		const host = new URL(url).hostname;
		return host === "127.0.0.1" || host === "localhost";
	} catch {
		return false;
	}
}
