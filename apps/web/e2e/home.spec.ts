import { expect, test } from "@playwright/test";
import { open } from "./support/open";

test("Inicio saluda a Ana, dice cuánto puede gastar hoy y muestra sus tres sobres", async ({
	page,
}) => {
	await open(page, "/home");

	await expect(page.getByRole("heading", { name: "Hola, Ana" })).toBeVisible();
	await expect(page.getByText("Puedes gastar hoy")).toBeVisible();
	await expect(page.getByRole("heading", { name: "Tus sobres" })).toBeVisible();
	for (const envelope of ["Necesidades", "Gustos", "Ahorro"]) {
		await expect(page.getByText(envelope, { exact: true })).toBeVisible();
	}
});

test("«Cómo se calcula» explica el número de hoy", async ({ page }) => {
	await open(page, "/home");

	await page.getByRole("button", { name: "Cómo se calcula" }).click();

	await expect(
		page.getByText(
			"Lo libre de Necesidades y Gustos, menos lo que falta pagar, entre los días que quedan.",
		),
	).toBeVisible();
});

test("?space=household sin hogar vuelve a Personal", async ({ page }) => {
	await open(page, "/home?space=household");

	await expect(page).toHaveURL(/\/home$/);
	await expect(page.getByRole("heading", { name: "Hola, Ana" })).toBeVisible();
});
