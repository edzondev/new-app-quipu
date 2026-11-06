import { expect, test } from "@playwright/test";
import { open } from "./support/open";

test("aportar S/ 50 al fondo lo sube a S/ 50.00 y habilita «Retirar»", async ({ page }) => {
	await open(page, "/savings");
	const fund = page.locator("section").filter({ hasText: "Fondo de emergencia" });
	await expect(fund).toContainText("0.00");
	await expect(page.getByRole("button", { name: "Retirar" })).toHaveCount(0);

	await page.getByRole("button", { name: "Aportar" }).click();
	const dialog = page.getByRole("dialog");
	await dialog.getByLabel("Monto").fill("50");
	await dialog.getByRole("button", { name: "Aportar" }).click();

	await expect(fund).toContainText("50.00");
	await expect(page.getByRole("button", { name: "Retirar" })).toBeVisible();
});

// Known bug: two instant clicks contribute twice (S/ 50 shows as S/ 100.00). The only guard is
// `save.isPending` (contribute-dialog.tsx), which turns true after a render, as in Registrar.
test.fixme("doble clic en «Aportar» aporta una sola vez", async ({ page }) => {
	await open(page, "/savings");
	await page.getByRole("button", { name: "Aportar" }).click();
	const dialog = page.getByRole("dialog");
	await dialog.getByLabel("Monto").fill("7");
	await dialog.getByRole("button", { name: "Aportar" }).click({ clickCount: 2 });

	await open(page, "/movements");
	await expect(page.getByRole("listitem").filter({ hasText: "S/ 7.00" })).toHaveCount(1);
});
