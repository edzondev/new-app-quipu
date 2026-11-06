import { expect, test } from "@playwright/test";
import { open } from "./support/open";
import { registerExpense } from "./support/register";

test("el filtro «Ingresos» oculta los gastos y «Todos» los devuelve", async ({ page }) => {
	await open(page, "/movements");
	await registerExpense(page, { amount: "8", note: "Taxi" });
	const expense = page.getByRole("listitem").filter({ hasText: "Taxi" });
	await expect(expense).toBeVisible();

	await page.getByRole("tab", { name: "Ingresos" }).click();
	await expect(expense).toBeHidden();
	await expect(page.getByText("Ingreso · Para este ciclo")).toBeVisible();

	await page.getByRole("tab", { name: "Todos" }).click();
	await expect(expense).toBeVisible();
});
