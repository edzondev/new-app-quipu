import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "../_generated/dataModel";

export async function enviarCodigo(
	_ctx: GenericCtx<DataModel>,
	{ email, otp }: { email: string; otp: string },
) {
	if (!process.env.RESEND_API_KEY) {
		console.log(`[dev] Código para ${email}: ${otp}`);
		return;
	}
	throw new Error("No se pudo enviar el código");
}
