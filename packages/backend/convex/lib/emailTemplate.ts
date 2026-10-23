const colors = {
	moss: "#5E8C79",
	canvas: "#EDEAE4",
	body: "#5A554E",
	line: "#E1DCD4",
	ink: "#23201C",
	surface: "#FFFFFF",
};

const serif = 'Georgia, "Times New Roman", serif';
const sans = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function escapeHtml(text: string) {
	return text.replace(/[&<>"']/g, (character) => {
		const map: Record<string, string> = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		};
		return map[character] ?? character;
	});
}

export function codeEmail(code: string) {
	const safe = escapeHtml(code);
	const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu código de Quipu</title>
</head>
<body style="margin:0;padding:0;background-color:${colors.canvas};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Tu código vence en 10 minutos.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${colors.canvas};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:${colors.surface};border-radius:10px;border:1px solid ${colors.line};overflow:hidden;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="4" style="width:4px;background-color:${colors.moss};font-size:0;line-height:0;">&nbsp;</td>
                  <td style="padding:28px 32px 32px;">
                    <p style="margin:0 0 24px;font-family:${serif};font-size:14px;letter-spacing:0.06em;color:${colors.moss};">Quipu</p>
                    <h1 style="margin:0 0 20px;font-family:${serif};font-size:26px;font-weight:600;line-height:1.25;color:${colors.ink};">Tu código para entrar</h1>
                    <p style="margin:0 0 16px;font-family:${sans};font-size:15px;line-height:1.55;color:${colors.body};">Escríbelo en Quipu. Vence en 10 minutos.</p>
                    <div style="margin:8px 0 20px;"><span style="display:inline-block;padding:12px 24px;border:1px solid #E8E6DF;border-radius:8px;font-family:monospace;font-size:32px;letter-spacing:12px;color:${colors.ink};">${safe}</span></div>
                    <hr style="border:none;border-top:1px solid ${colors.line};margin:28px 0 20px;" />
                    <p style="margin:0;font-family:${sans};font-size:12px;line-height:1.45;color:${colors.body};">Si no pediste este código, puedes ignorar este correo.</p>
                  </td>
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
	const text = [
		"Tu código para entrar",
		"",
		code,
		"",
		"Escríbelo en Quipu. Vence en 10 minutos.",
		"",
		"Si no pediste este código, puedes ignorar este correo.",
	].join("\n");
	return { subject: `Tu código de Quipu: ${code}`, html, text };
}
