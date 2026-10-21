import type { GenericCtx } from "@convex-dev/better-auth";
import { isRunMutationCtx } from "@convex-dev/better-auth/utils";
import { Resend } from "@convex-dev/resend";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { assertEmailAllowed } from "./domainPolicy";
import { correoDelCodigo } from "./plantillaCorreo";

export async function enviarCodigo(
	ctx: GenericCtx<DataModel>,
	{ email, otp }: { email: string; otp: string },
) {
	assertEmailAllowed(email);
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		console.log(`[dev] Código para ${email}: ${otp}`);
		return;
	}
	if (!isRunMutationCtx(ctx)) throw new Error("No se pudo enviar el código");
	const resend = new Resend(components.resend, { testMode: false, apiKey });
	const { subject, html } = correoDelCodigo(otp);
	return await resend.sendEmail(ctx, {
		from: process.env.RESEND_FROM ?? "Quipu <hola@quipu-finance.app>",
		to: email,
		subject,
		html,
	});
}
