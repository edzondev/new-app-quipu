/** How long a sign-in or deletion code lasts. Better Auth reads it too (`expiresIn`, in seconds). */
export const OTP_EXPIRES_IN_MINUTES = 5;

const LOGO_LIGHT = "https://assets.quipu-finance.app/email/logo-quipu.png";
const LOGO_DARK = "https://assets.quipu-finance.app/email/logo-quipu-dark.png";

const SANS =
	"-apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, Helvetica, Arial, sans-serif";
const MONO =
	"&quot;IBM Plex Mono&quot;, ui-monospace, &quot;SFMono-Regular&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace";

const escapeHtml = (value: string) =>
	value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function otpEmail({
	otp,
	email,
	deletion,
}: {
	otp: string;
	email: string;
	deletion: boolean;
}): { subject: string; html: string; text: string } {
	const subject = deletion ? "Código para eliminar tu cuenta de Quipu" : "Tu código de Quipu";
	const lead = deletion
		? "Usa este código para eliminar tu cuenta de Quipu."
		: "Usa este código para entrar a Quipu.";
	const expiry = `Vence en ${OTP_EXPIRES_IN_MINUTES} minutos.`;
	const gray = deletion
		? "Si no fuiste tú, no lo compartas con nadie."
		: "Si no lo pediste, ignora este correo.";

	const safeOtp = escapeHtml(otp);
	const safeEmail = escapeHtml(email);

	const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${subject}</title>
<style>
@media (prefers-color-scheme: dark) {
  .e-bg { background-color: #13110f !important; }
  .e-ink { color: #f2f0ed !important; }
  .e-mut { color: #9a968f !important; }
  .e-box { background-color: #24221f !important; }
  .e-line { border-color: #2e2b28 !important; }
  .logo-light { display: none !important; max-height: 0 !important; overflow: hidden !important; }
  .logo-dark { display: block !important; max-height: none !important; overflow: visible !important; }
}
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">
<div style="display: none; max-height: 0; overflow: hidden; opacity: 0; mso-hide: all;">Tu código es ${safeOtp}.</div>
<table role="presentation" class="e-bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; background-color: #ffffff;">
<tr>
<td align="center" class="e-bg" style="background-color: #ffffff;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; width: 100%; max-width: 560px; margin: 0 auto;">
<tr>
<td class="e-bg" style="background-color: #ffffff; padding: 48px 40px 44px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
<tr>
<td align="left" style="padding: 0 0 32px;">
<img class="logo-light" src="${LOGO_LIGHT}" width="40" height="36" alt="Quipu" style="display: block; width: 40px; height: 36px; border: 0; outline: none; text-decoration: none;" />
<img class="logo-dark" src="${LOGO_DARK}" width="40" height="36" alt="Quipu" style="display: none; width: 40px; height: 36px; border: 0; outline: none; text-decoration: none; max-height: 0; overflow: hidden;" />
</td>
</tr>
<tr>
<td class="e-ink" align="left" style="padding: 0 0 24px; font-family: ${SANS}; font-size: 16px; line-height: 24px; color: #241c15;">${lead} <span style="white-space: nowrap;">${expiry}</span></td>
</tr>
<tr>
<td class="e-box" align="center" style="background-color: #f2f3f5; border-radius: 12px; padding: 20px 16px;">
<p class="e-ink" style="margin: 0; padding-left: 0.32em; font-family: ${MONO}; font-size: 40px; line-height: 1.15; font-weight: 700; letter-spacing: 0.32em; color: #1d1610;">${safeOtp}</p>
</td>
</tr>
<tr>
<td class="e-mut" align="left" style="padding: 24px 0 0; font-family: ${SANS}; font-size: 14px; line-height: 20px; color: #6d645d;">${gray}</td>
</tr>
<tr>
<td style="padding: 32px 0 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
<tr>
<td class="e-line" style="border-top: 1px solid #e4dfd7; font-size: 0; line-height: 0;">&nbsp;</td>
</tr>
</table>
</td>
</tr>
<tr>
<td class="e-mut" align="center" style="padding: 24px 0 0; font-family: ${SANS}; font-size: 13px; line-height: 20px; color: #6d645d;">Este correo se envió a ${safeEmail}.</td>
</tr>
<tr>
<td class="e-ink" align="center" style="padding: 4px 0 0; font-family: ${SANS}; font-size: 13px; line-height: 20px; font-weight: 700; color: #1d1610;">Quipu</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;

	const text = `${lead} ${expiry}

${otp}

${gray}

Este correo se envió a ${email}.

Quipu`;

	return { subject, html, text };
}
