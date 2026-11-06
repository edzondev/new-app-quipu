import { expect, type Page, test } from "@playwright/test";
import { open } from "./support/open";

const fundSection = (page: Page) =>
	page.locator("section").filter({ hasText: "Fondo de emergencia" });

/** The fund balance in cents, read from the "S/ 50.00" shown in the fund card. */
async function readFundCents(page: Page) {
	const text = await fundSection(page).textContent();
	const amount = text?.match(/S\/([\d,.]+)/)?.[1];
	if (!amount) throw new Error("No se encontró el saldo del fondo");
	return Math.round(Number(amount.replaceAll(",", "")) * 100);
}

test("aportar S/ 50 al fondo lo sube a S/ 50.00 y habilita «Retirar»", async ({ page }) => {
	await open(page, "/savings");
	const fund = fundSection(page);
	await expect(fund).toContainText("0.00");
	await expect(page.getByRole("button", { name: "Retirar" })).toHaveCount(0);

	await page.getByRole("button", { name: "Aportar" }).click();
	const dialog = page.getByRole("dialog");
	await dialog.getByLabel("Monto").fill("50");
	await dialog.getByRole("button", { name: "Aportar" }).click();

	await expect(fund).toContainText("50.00");
	await expect(page.getByRole("button", { name: "Retirar" })).toBeVisible();
});

// Known bug, accepted as pending for the idempotency unit: two instant clicks contribute twice.
// The only guard is `save.isPending` (contribute-dialog.tsx), which turns true after a render.
test.fixme("doble clic en «Aportar» sube el fondo exactamente lo aportado", async ({ page }) => {
	await open(page, "/savings");
	const before = await readFundCents(page);

	await page.getByRole("button", { name: "Aportar" }).click();
	const dialog = page.getByRole("dialog");
	await dialog.getByLabel("Monto").fill("7");
	await dialog.getByRole("button", { name: "Aportar" }).click({ clickCount: 2 });
	await expect(dialog).toBeHidden();

	await open(page, "/savings");
	expect(await readFundCents(page)).toBe(before + 700);
});
