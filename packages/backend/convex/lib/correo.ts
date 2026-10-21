import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "../_generated/dataModel";

export async function enviarCodigo(
	_ctx: GenericCtx<DataModel>,
	{ email, otp }: { email: string; otp: string },
) {
	console.log(`[dev] Código para ${email}: ${otp}`);
}
