import { expect, type Page, test } from "@playwright/test";
import { open } from "./support/open";
import { registerExpense } from "./support/register";

/** The "Disponible hoy" figure at the foot of Movimientos, read after a fresh load. */
async function readDaily(page: Page) {
	await open(page, "/movements");
	const footer = await page.getByText(/Disponible hoy S\/ [\d,.]+/).textContent();
	const amount = footer?.match(/Disponible hoy S\/ ([\d,.]+)/)?.[1];
	if (!amount) throw new Error("No se encontró «Disponible hoy» en Movimientos");
	return Number(amount.replaceAll(",", ""));
}

test("registrar un gasto baja el número de hoy y lo deja en Movimientos", async ({ page }) => {
	const before = await readDaily(page);

	await registerExpense(page, { amount: "12.50", note: "Almuerzo" });

	const after = await readDaily(page);
	expect(after).toBeLessThan(before);
	await expect(page.getByRole("listitem").filter({ hasText: "Almuerzo" })).toContainText(
		"− S/ 12.50",
	);
});

test("un gasto sin monto no se guarda y avisa", async ({ page }) => {
	await open(page, "/home");
	await page.getByRole("button", { name: "+ Registrar" }).click();
	const dialog = page.getByRole("dialog");

	await dialog.getByRole("button", { name: "Guardar gasto" }).click();

	await expect(dialog.getByText("Escribe un monto.")).toBeVisible();
});

// Known bug: two instant clicks save the expense twice. The only guard is `pending` from
// use-movement-actions.ts, which turns true after TanStack Form's async validation and a render.
test.fixme("doble clic en «Guardar gasto» registra un solo gasto", async ({ page }) => {
	await open(page, "/home");

	await registerExpense(page, { amount: "3", note: "Doble clic", doubleClick: true });

	await open(page, "/movements");
	await expect(page.getByRole("listitem").filter({ hasText: "Doble clic" })).toHaveCount(1);
});

test("un Extra directo a Ahorro no cambia el número de hoy", async ({ page }) => {
	const before = await readDaily(page);

	await page.getByRole("button", { name: "+ Registrar" }).click();
	const dialog = page.getByRole("dialog");
	await dialog.getByText("Ingreso", { exact: true }).click();
	await dialog.getByText("Extra", { exact: true }).click();
	await dialog.getByText("Bono", { exact: true }).click();
	await dialog.getByText("Directo a Ahorro", { exact: true }).click();
	await expect(dialog.getByText("Tu número de hoy no cambia.")).toBeVisible();
	await dialog.getByLabel("Monto").fill("30");
	await dialog.getByRole("button", { name: "Guardar ingreso" }).click();
	await expect(dialog).toBeHidden();

	expect(await readDaily(page)).toBe(before);
	await expect(page.getByText("Ingreso · Extra")).toBeVisible();
});
