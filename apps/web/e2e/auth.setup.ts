import { expect, test as setup } from "@playwright/test";
import { AUTH_FILE } from "../playwright.config";
import { open } from "./support/open";
import { watchOtp } from "./support/otp";

// A new user per run: every spec starts from an empty cycle and the code limits
// (1 per 90 s and 6 per hour, per email) never get in the way.
setup("alta de Ana: código, onboarding e Inicio con saludo", async ({ page }) => {
	const email = `ana-${Date.now()}@e2e.quipu.test`;
	const otp = await watchOtp(email);

	try {
		await open(page, "/sign-up");
		await page.getByLabel("¿Cómo te llamas?").fill("Ana");
		await page.getByLabel("Tu correo").fill(email);
		await page.getByRole("button", { name: "Enviarme el código" }).click();
		await page.getByLabel("Código de 6 dígitos").fill(await otp.read());
	} finally {
		otp.close();
	}
	await page.getByRole("button", { name: "Confirmar" }).click();
	await page.getByRole("button", { name: "Ahora no" }).click();

	await page.getByLabel("Cuánto tienes hoy").fill("500");
	await page.getByLabel("Cuánto ganas por ciclo").fill("500");
	await page.getByRole("button", { name: "Continuar" }).click();
	await page.getByRole("button", { name: "Empezar" }).click();

	await expect(page.getByRole("heading", { name: "Hola, Ana" })).toBeVisible();
	await page.context().storageState({ path: AUTH_FILE });
});
