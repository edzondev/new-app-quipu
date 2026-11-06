import { expect, type Page } from "@playwright/test";

type Expense = { amount: string; note: string; doubleClick?: boolean };

/** Registers an expense through the dialog. The dialog closes only once the expense is saved. */
export async function registerExpense(page: Page, { amount, note, doubleClick }: Expense) {
	await page.getByRole("button", { name: "+ Registrar" }).click();
	const dialog = page.getByRole("dialog");
	await dialog.getByLabel("Monto").fill(amount);
	await dialog.getByRole("button", { name: "Más detalles" }).click();
	await dialog.getByLabel("Concepto · opcional").fill(note);
	await dialog
		.getByRole("button", { name: "Guardar gasto" })
		.click({ clickCount: doubleClick ? 2 : 1 });
	await expect(dialog).toBeHidden();
}
