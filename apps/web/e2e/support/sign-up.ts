import { expect, type Page } from "@playwright/test";
import { open } from "./open";
import { watchOtp } from "./otp";

/**
 * Signs a new user in through the UI (real code from the Convex log; the account is made when the
 * code is verified), skips the key offer and finishes onboarding (name, then S/ 500 in a monthly cycle). Ends on Inicio. Returns the email.
 */
export async function signUp(page: Page, name: string) {
	const email = `${name.toLowerCase()}-${Date.now()}@e2e.quipu.test`;
	const otp = await watchOtp(email);

	try {
		await open(page, "/sign-in");
		await page.getByLabel("Correo").fill(email);
		await page.getByRole("button", { name: "Enviar código" }).click();
		await page.getByLabel("Código de 6 dígitos").fill(await otp.read());
	} finally {
		otp.close();
	}
	await page.getByRole("button", { name: "Entrar", exact: true }).click();
	await page.getByRole("button", { name: "Ahora no" }).click();

	await page.getByLabel("Tu nombre").fill(name);
	await page.getByRole("button", { name: "Continuar" }).click();
	await page.getByLabel("Cuánto tienes hoy").fill("500");
	await page.getByLabel("Cuánto ganas por ciclo").fill("500");
	await page.getByRole("button", { name: "Continuar" }).click();
	await page.getByRole("button", { name: "Empezar" }).click();

	await expect(page.getByRole("heading", { name: `Hola, ${name}` })).toBeVisible();
	return email;
}
