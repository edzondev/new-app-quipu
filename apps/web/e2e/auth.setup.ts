import { test as setup } from "@playwright/test";
import { AUTH_FILE } from "../playwright.config";
import { signUp } from "./support/sign-up";

// A new user per run: every spec starts from an empty cycle and the code limits
// (1 per 90 s and 6 per hour, per email) never get in the way.
setup(
	"Ana entra con código, pone su nombre en los primeros pasos y ve Inicio con saludo",
	async ({ page }) => {
		await signUp(page, "Ana");
		await page.context().storageState({ path: AUTH_FILE });
	},
);
