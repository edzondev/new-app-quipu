import { expect, test } from "@playwright/test";
import { getLimaDate } from "@quipu/backend/shared/dates";
import { open } from "./support/open";

// Due today: payable in this cycle whatever day the test runs.
const dueToday = String(Number(getLimaDate().slice(8)));

test("un compromiso nuevo, pagado, pasa a «Ya pagados este ciclo»", async ({ page }) => {
	await open(page, "/commitments");
	await expect(
		page.getByText("Sin compromisos. Añade tus pagos fijos y Quipu los reserva por ti."),
	).toBeVisible();

	await page.getByRole("button", { name: "+ Añadir compromiso" }).click();
	const dialog = page.getByRole("dialog");
	await dialog.getByLabel("Nombre").fill("Luz del Sur");
	await dialog.getByLabel("Monto").fill("80");
	await dialog.getByLabel("Vence").fill(dueToday);
	await dialog.getByRole("button", { name: "Guardar compromiso" }).click();

	const row = page.getByRole("listitem").filter({ hasText: "Luz del Sur" });
	await expect(row).toHaveCount(1);

	await row.getByRole("button", { name: "Ya pagué" }).click();
	await row.getByRole("button", { name: "Confirmar pago" }).click();

	const paid = page.locator("section").filter({ hasText: "Ya pagados este ciclo" });
	await expect(paid).toContainText("Luz del Sur");
	await expect(paid).toContainText("80.00");
});

// Known bug: two instant clicks create two commitments. The only guard is `save.isPending`
// (add-commitment-dialog.tsx), which turns true after TanStack Form's async validation and a render.
test.fixme("doble clic en «Guardar compromiso» crea un solo compromiso", async ({ page }) => {
	await open(page, "/commitments");
	await page.getByRole("button", { name: "+ Añadir compromiso" }).click();
	const dialog = page.getByRole("dialog");
	await dialog.getByLabel("Nombre").fill("Agua");
	await dialog.getByLabel("Monto").fill("30");
	await dialog.getByLabel("Vence").fill(dueToday);
	await dialog.getByRole("button", { name: "Guardar compromiso" }).click({ clickCount: 2 });

	await expect(page.getByRole("listitem").filter({ hasText: "Agua" })).toHaveCount(1);
});
