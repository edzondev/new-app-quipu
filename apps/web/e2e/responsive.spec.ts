import { expect, type Locator, test } from "@playwright/test";
import { NOTE_MAX_LENGTH } from "@quipu/backend/shared/budget";
import { open } from "./support/open";
import { registerExpense } from "./support/register";

const WIDTH = 375;

test.use({ viewport: { width: WIDTH, height: 812 } });

async function expectWithinViewport(locator: Locator) {
	const box = await locator.boundingBox();
	if (!box) throw new Error("El elemento no tiene caja en pantalla");
	expect(box.x).toBeGreaterThanOrEqual(0);
	expect(box.x + box.width).toBeLessThanOrEqual(WIDTH);
}

test("Inicio no tiene scroll horizontal a 375 px", async ({ page }) => {
	await open(page, "/home");
	await expect(page.getByRole("heading", { name: "Hola, Ana" })).toBeVisible();

	const { scrollWidth, clientWidth } = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth,
	}));
	expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("el menú lateral navega y se cierra a 375 px", async ({ page }) => {
	await open(page, "/home");
	await page.getByRole("button", { name: "Menú" }).click();
	await page.getByRole("dialog").getByRole("link", { name: "Movimientos" }).click();

	await expect(page).toHaveURL(/\/movements/);
	await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("el diálogo de Registrar cabe en 375 px", async ({ page }) => {
	await open(page, "/home");
	await page.getByRole("button", { name: "+ Registrar" }).click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();

	await expectWithinViewport(dialog);
	expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test("un concepto de 40 caracteres cabe en su fila de Movimientos a 375 px", async ({ page }) => {
	await open(page, "/movements");
	const note = "m".repeat(NOTE_MAX_LENGTH);
	await registerExpense(page, { amount: "5", note });

	const row = page.getByRole("listitem").filter({ hasText: note });
	await expectWithinViewport(row);
	await expectWithinViewport(row.getByText("− S/ 5.00"));
});
