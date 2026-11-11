import { expect, test } from "vitest";
import { otpEmail } from "../convex/emails/otp";

test("each code email has its subject, the code in html and text, and the escaped address", () => {
	const sign = otpEmail({ otp: "616029", email: "a&b<c>@x.com", deletion: false });
	const remove = otpEmail({ otp: "616029", email: "a&b<c>@x.com", deletion: true });

	expect(sign.subject).toBe("Tu código de Quipu");
	expect(remove.subject).toBe("Código para eliminar tu cuenta de Quipu");

	for (const mail of [sign, remove]) {
		expect(mail.html).toContain("616029");
		expect(mail.text).toContain("616029");
		expect(mail.html).toContain("a&amp;b&lt;c&gt;@x.com");
		expect(mail.html).not.toContain("a&b<c>@x.com");
	}
});
