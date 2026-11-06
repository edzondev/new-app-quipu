import { expect, type Page, test } from "@playwright/test";
import { open } from "./support/open";
import { addVirtualAuthenticator, copyPasskeys } from "./support/passkey";
import { registerExpense } from "./support/register";
import { signUp } from "./support/sign-up";

async function openAvatarMenu(page: Page) {
	await page.getByRole("button", { name: "Cuenta" }).click();
}

/** "Puedes gastar hoy" as Inicio paints it, whole and cents in separate spans. */
async function readDailyNumber(page: Page) {
	const text = await page
		.locator("section")
		.filter({ hasText: "Puedes gastar hoy" })
		.locator("p.font-mono")
		.innerText();
	return text.replace(/\s/g, "");
}

async function setSplit(page: Page, [needs, wants, savings]: [string, string, string]) {
	const dialog = page.getByRole("dialog");
	await dialog.getByLabel("Porcentaje de Necesidades").fill(needs);
	await dialog.getByLabel("Porcentaje de Gustos").fill(wants);
	await dialog.getByLabel("Porcentaje de Ahorro").fill(savings);
}

test("el menú del avatar tiene Ajustes, Tema y Cerrar sesión, y lleva a Ajustes", async ({
	page,
}) => {
	await open(page, "/home");
	await openAvatarMenu(page);

	await expect(page.getByRole("menuitem", { name: "Ajustes" })).toBeVisible();
	for (const theme of ["Sistema", "Claro", "Oscuro"]) {
		await expect(page.getByRole("menuitemradio", { name: theme })).toBeVisible();
	}
	await expect(page.getByRole("menuitem", { name: "Cerrar sesión" })).toBeVisible();

	await page.getByRole("menuitem", { name: "Ajustes" }).click();
	await expect(page).toHaveURL(/\/settings$/);
	await expect(page.getByRole("heading", { name: "Ajustes", level: 1 })).toBeVisible();
});

test("Ajustes tiene Ciclo, Reparto, Llaves y sesiones y Legal, y nada de lo que aún no existe", async ({
	page,
}) => {
	await open(page, "/settings");

	for (const title of ["Ciclo", "Reparto", "Llaves y sesiones", "Legal"]) {
		await expect(page.getByText(title, { exact: true })).toBeVisible();
	}
	await expect(page.getByText("Necesidades 50% · Gustos 30% · Ahorro 20%")).toBeVisible();
	for (const missing of ["Apariencia", "Cerrar sesión", "Eliminar cuenta", "Suscripción"]) {
		await expect(page.getByText(missing)).toHaveCount(0);
	}
});

test("Legal abre la política y los términos en otra pestaña", async ({ page }) => {
	await open(page, "/settings");

	const privacy = page.getByRole("listitem").filter({ hasText: "Política de privacidad" });
	const terms = page.getByRole("listitem").filter({ hasText: "Términos y condiciones" });
	for (const [row, href] of [
		[privacy, "https://quipu-finance.app/privacidad"],
		[terms, "https://quipu-finance.app/terminos"],
	] as const) {
		const link = row.getByRole("link", { name: "Abrir ↗" });
		await expect(link).toHaveAttribute("href", href);
		await expect(link).toHaveAttribute("target", "_blank");
		await expect(link).toHaveAttribute("rel", /noopener/);
	}
});

test("«Oscuro» se guarda y sigue ahí al recargar, aunque no cargue ningún script de la app", async ({
	page,
}) => {
	await open(page, "/home");
	await openAvatarMenu(page);
	await page.getByRole("menuitemradio", { name: "Oscuro" }).click();
	await expect(page.locator("html")).toHaveClass(/dark/);
	// Native controls (select, number spinners, scrollbars) follow the theme too.
	await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");

	// The inline script in <head> must apply it before anything from the bundle runs.
	await page.route(/\.(m?[jt]sx?)(\?.*)?$/, (route) => route.abort());
	await page.reload({ waitUntil: "domcontentloaded" });
	await expect(page.locator("html")).toHaveClass(/dark/);

	await page.unroute(/\.(m?[jt]sx?)(\?.*)?$/);
	await open(page, "/home");
	await openAvatarMenu(page);
	await expect(page.getByRole("menuitemradio", { name: "Oscuro" })).toBeChecked();
	await page.getByRole("menuitemradio", { name: "Claro" }).click();
	await expect(page.locator("html")).not.toHaveClass(/dark/);
	await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
});

/** Counts the view transitions the page starts, on <html data-vt>. */
async function countViewTransitions(page: Page) {
	await page.addInitScript(() => {
		const original = document.startViewTransition.bind(document);
		document.startViewTransition = (callback) => {
			const root = document.documentElement;
			root.dataset.vt = String(Number(root.dataset.vt ?? 0) + 1);
			return original(callback);
		};
	});
}

test("cambiar el tema crece en círculo desde donde se eligió", async ({ page }) => {
	await countViewTransitions(page);
	await open(page, "/home");
	await openAvatarMenu(page);
	await page.getByRole("menuitemradio", { name: "Oscuro" }).click();

	await expect(page.locator("html")).toHaveAttribute("data-vt", "1");
	await expect(page.locator("html")).toHaveClass(/dark/);
	const origin = await page
		.locator("html")
		.evaluate((el) => el.style.getPropertyValue("--theme-x"));
	expect(origin).toMatch(/^\d+(\.\d+)?px$/);
});

test.describe("con «reducir movimiento»", () => {
	test.use({ reducedMotion: "reduce" });

	test("cambiar el tema es inmediato, sin animación", async ({ page }) => {
		await countViewTransitions(page);
		await open(page, "/home");
		await openAvatarMenu(page);
		await page.getByRole("menuitemradio", { name: "Oscuro" }).click();

		await expect(page.locator("html")).toHaveClass(/dark/);
		await expect(page.locator("html")).not.toHaveAttribute("data-vt", /.+/);
	});
});

test("cambiar el ciclo lo deja pendiente, sin tocar el ciclo actual ni el número de hoy", async ({
	page,
}) => {
	await open(page, "/home");
	const rangeBefore = await page.getByText(/^Ciclo .* → /).innerText();
	const dailyBefore = await readDailyNumber(page);

	await open(page, "/settings");
	await page.getByRole("listitem").filter({ hasText: "Ciclo" }).getByRole("button").click();
	const dialog = page.getByRole("dialog");
	await dialog.getByRole("button", { name: "Cada semana" }).click();
	await dialog.getByLabel("Empieza el").selectOption({ label: "Lunes" });
	await dialog.getByRole("button", { name: "Guardar" }).click();
	await expect(dialog).toBeHidden();

	const row = page.getByRole("listitem").filter({ hasText: "Ciclo" });
	await expect(row).toContainText("Ahora: Cada mes · empieza el día");
	await expect(row).toContainText("Tu ciclo actual cierra el");
	await expect(row).toContainText(/Desde el \d+ \w+: Cada semana · empieza el lunes\./);

	await open(page, "/home");
	await expect(page.getByText(/^Ciclo .* → /)).toHaveText(rangeBefore);
	expect(await readDailyNumber(page)).toBe(dailyBefore);

	// Going back to the current plan clears the pending change.
	await open(page, "/settings");
	await row.getByRole("button").click();
	await dialog.getByRole("button", { name: "Cada mes" }).click();
	await dialog.getByLabel("Empieza el").selectOption({ label: "Día 1" });
	await dialog.getByRole("button", { name: "Guardar" }).click();
	await expect(dialog).toBeHidden();
	await expect(row).toContainText("los cambios aplican desde el próximo ciclo");
	await expect(row).not.toContainText("Desde el");
});

test("el reparto se edita desde Ajustes y desde Inicio, y la previa es el número que queda en Inicio", async ({
	page,
}) => {
	await open(page, "/home");
	await registerExpense(page, { amount: "10", note: "Prueba de reparto" });

	await open(page, "/settings");
	await page.getByRole("listitem").filter({ hasText: "Reparto" }).getByRole("button").click();
	const dialog = page.getByRole("dialog");

	await setSplit(page, ["90", "30", "20"]);
	await expect(dialog.getByText("Los tres sobres tienen que sumar 100%.")).toBeVisible();
	await expect(dialog.getByRole("button", { name: "Guardar" })).toBeDisabled();

	await setSplit(page, ["40", "40", "20"]);
	const preview = dialog.getByText(/Con este reparto, hoy puedes gastar/);
	await expect(preview).toBeVisible();
	const promised = (await preview.innerText()).match(/S\/\s*([\d,]+\.\d{2})/)?.[1];
	await dialog.getByRole("button", { name: "Guardar" }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByText("Necesidades 40% · Gustos 40% · Ahorro 20%")).toBeVisible();

	await open(page, "/home");
	expect(await readDailyNumber(page)).toBe(`S/${promised}`);

	// The same editor opens from "Tus sobres" and starts from what was saved.
	await page.getByRole("button", { name: "Editar reparto" }).click();
	await expect(dialog.getByLabel("Porcentaje de Necesidades")).toHaveValue("40");
	await setSplit(page, ["50", "30", "20"]);
	await dialog.getByRole("button", { name: "Guardar" }).click();
	await expect(dialog).toBeHidden();
});

test("el editor de reparto limpia lo que se escribe o se pega", async ({ page }) => {
	await open(page, "/settings");
	await page.getByRole("listitem").filter({ hasText: "Reparto" }).getByRole("button").click();
	const needs = page.getByRole("dialog").getByLabel("Porcentaje de Necesidades");

	await needs.fill("");
	await expect(needs).toHaveValue("0");
	// A number field drops what is not a number, so a paste of "a b,c" cannot reach the split.
	await needs.focus();
	await page.keyboard.insertText("a b,c");
	await expect(needs).toHaveValue("0");
	await page.keyboard.insertText("5");
	expect(Number(await needs.inputValue())).toBe(5);
});

test.describe("sesiones y llaves, con un usuario nuevo", () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test("agregar y borrar una llave; la sesión actual dice «Este navegador» y no tiene «Cerrar»", async ({
		page,
		context,
	}) => {
		await signUp(page, "Beto");
		await addVirtualAuthenticator(context, page);
		await open(page, "/settings");
		await page
			.getByRole("listitem")
			.filter({ hasText: "Llaves y sesiones" })
			.getByRole("button")
			.click();
		const dialog = page.getByRole("dialog");

		await expect(dialog.getByText("Todavía no tienes una llave de acceso.")).toBeVisible();
		await dialog.getByRole("button", { name: "Agregar una llave" }).click();
		await expect(dialog.getByText("Llave de acceso", { exact: true })).toBeVisible();

		const sessions = dialog.getByRole("listitem").filter({ hasText: "Este navegador" });
		await expect(sessions).toHaveCount(1);
		await expect(sessions.getByRole("button", { name: "Cerrar" })).toHaveCount(0);

		await dialog.getByRole("button", { name: "Borrar" }).click();
		await expect(page.getByRole("alertdialog", { name: "¿Borrar esta llave?" })).toBeVisible();
		await page.getByRole("alertdialog").getByRole("button", { name: "Borrar" }).click();
		await expect(dialog.getByText("Todavía no tienes una llave de acceso.")).toBeVisible();
	});

	test("agregar una llave: una ceremonia abortada no es un fallo, el resto se ve y dos clics piden una sola llave", async ({
		page,
	}) => {
		await signUp(page, "Dani");
		await open(page, "/settings");
		await page
			.getByRole("listitem")
			.filter({ hasText: "Llaves y sesiones" })
			.getByRole("button")
			.click();
		const dialog = page.getByRole("dialog");
		const add = dialog.getByRole("button", { name: "Agregar una llave" });

		// The browser prompt is replaced by one that fails the way a browser does, and counts its calls.
		async function failPrompt(name: string, message: string) {
			await page.evaluate(
				({ name, message }) => {
					Reflect.set(window, "promptCalls", 0);
					navigator.credentials.create = () => {
						Reflect.set(window, "promptCalls", Number(Reflect.get(window, "promptCalls")) + 1);
						return Promise.reject(new DOMException(message, name));
					};
				},
				{ name, message },
			);
		}
		const promptCalls = () => page.evaluate(() => Number(Reflect.get(window, "promptCalls")));

		// An AbortError is what the library reports as ERROR_CEREMONY_ABORTED ("Registration cancelled").
		await failPrompt("AbortError", "The operation was aborted.");
		await add.click();
		await expect.poll(promptCalls).toBe(1);
		await expect(add).toBeEnabled();
		await expect(dialog.getByRole("alert")).toHaveCount(0);

		// A NotAllowedError is passed through and stays visible, whatever its message says.
		await failPrompt("NotAllowedError", "The operation either timed out or was not allowed.");
		await add.click();
		await expect.poll(promptCalls).toBe(1);
		await expect(dialog.getByRole("alert")).toHaveText("Algo salió mal. Inténtalo otra vez.");

		// Two clicks with no pause between them ask for one key.
		await failPrompt("AbortError", "The operation was aborted.");
		await add.dblclick();
		await expect.poll(promptCalls).toBe(1);
		await expect(add).toBeEnabled();
		expect(await promptCalls()).toBe(1);
		await expect(dialog.getByRole("alert")).toHaveCount(0);
	});

	test("cerrar otra sesión no cierra la actual", async ({ page, context, browser }) => {
		await signUp(page, "Carla");
		const first = await addVirtualAuthenticator(context, page);
		await open(page, "/settings");
		await page
			.getByRole("listitem")
			.filter({ hasText: "Llaves y sesiones" })
			.getByRole("button")
			.click();
		await page.getByRole("dialog").getByRole("button", { name: "Agregar una llave" }).click();
		await expect(
			page.getByRole("dialog").getByText("Llave de acceso", { exact: true }),
		).toBeVisible();

		// The same person on another device: it signs in with the passkey just created.
		const otherContext = await browser.newContext();
		const other = await otherContext.newPage();
		await copyPasskeys(first, await addVirtualAuthenticator(otherContext, other));
		await open(other, "/sign-in");
		await other.getByRole("button", { name: "Entrar con mi llave" }).click();
		await expect(other).not.toHaveURL(/\/sign-in$/);
		// Right after a passkey sign-in the app lands on /onboarding; Inicio loads on a second request.
		await open(other, "/home");
		await expect(other.getByRole("heading", { name: "Hola, Carla" })).toBeVisible();

		await open(page, "/settings");
		await page
			.getByRole("listitem")
			.filter({ hasText: "Llaves y sesiones" })
			.getByRole("button")
			.click();
		const dialog = page.getByRole("dialog");
		// One passkey sign-in can open more than one session, so close every other one.
		const others = dialog.getByRole("listitem").filter({ hasText: "Otro dispositivo" });
		await expect(others.first()).toBeVisible();
		for (let left = await others.count(); left > 0; left--) {
			await others.first().getByRole("button", { name: "Cerrar" }).click();
			await expect(others).toHaveCount(left - 1);
		}
		await expect(dialog.getByText("Este navegador")).toBeVisible();

		await open(other, "/home");
		await expect(other).toHaveURL(/\/sign-in$/);
		await otherContext.close();
	});

	test("«Cerrar todas» avisa que también sales de este dispositivo y lleva a /sign-in", async ({
		page,
	}) => {
		await signUp(page, "Diego");
		await open(page, "/settings");
		await page
			.getByRole("listitem")
			.filter({ hasText: "Llaves y sesiones" })
			.getByRole("button")
			.click();
		await page.getByRole("button", { name: "Cerrar todas las sesiones" }).click();

		const confirm = page.getByRole("alertdialog", { name: "¿Cerrar todas las sesiones?" });
		await expect(confirm.getByText("También saldrás de este dispositivo.")).toBeVisible();
		await confirm.getByRole("button", { name: "Cerrar todas" }).click();

		await expect(page).toHaveURL(/\/sign-in$/);
		await open(page, "/home");
		await expect(page).toHaveURL(/\/sign-in$/);
	});

	test("«Cerrar sesión» del avatar lleva a /sign-in", async ({ page }) => {
		await signUp(page, "Elena");
		await openAvatarMenu(page);
		await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();

		await expect(page).toHaveURL(/\/sign-in$/);
	});

	test("una sesión antigua ofrece «Volver a iniciar sesión»", async ({ page }) => {
		await signUp(page, "Fabio");
		// Better Auth answers a session older than 24 h with this code (freshSessionMiddleware).
		await page.route("**/api/auth/list-sessions", (route) =>
			route.fulfill({
				status: 403,
				contentType: "application/json",
				body: JSON.stringify({ code: "SESSION_NOT_FRESH", message: "Session is not fresh" }),
			}),
		);
		await open(page, "/settings");
		await page
			.getByRole("listitem")
			.filter({ hasText: "Llaves y sesiones" })
			.getByRole("button")
			.click();

		await expect(
			page.getByText("Por seguridad, vuelve a iniciar sesión para ver tus sesiones"),
		).toBeVisible();
		await page.getByRole("button", { name: "Volver a iniciar sesión" }).click();
		await expect(page).toHaveURL(/\/sign-in$/);
	});
});
