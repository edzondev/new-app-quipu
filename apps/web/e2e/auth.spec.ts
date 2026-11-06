import { expect, test } from "@playwright/test";
import { open } from "./support/open";

test.use({ storageState: { cookies: [], origins: [] } });

// `for` and not `map`: each iteration registers a test, and each route must fail on its own.
for (const path of ["/home", "/movements", "/savings", "/commitments", "/onboarding"]) {
	test(`sin sesión, ${path} lleva a /sign-in`, async ({ page }) => {
		await open(page, path);
		await expect(page).toHaveURL(/\/sign-in$/);
	});
}
