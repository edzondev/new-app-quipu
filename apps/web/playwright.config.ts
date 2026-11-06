import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// Ana's session, written by auth.setup.ts and reused by every spec.
export const AUTH_FILE = path.join(import.meta.dirname, "e2e/.auth/ana.json");

export default defineConfig({
	testDir: "e2e",
	// The first request after starting Vite compiles the app, which is slow.
	timeout: 60_000,
	// Specs share one user and each expense moves her daily number, so they run in order.
	workers: 1,
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL: "http://localhost:3000",
		screenshot: "on",
		trace: "retain-on-failure",
	},
	webServer: {
		command: "pnpm dev",
		url: "http://localhost:3000",
		reuseExistingServer: true,
		timeout: 120_000,
	},
	projects: [
		{ name: "setup", testMatch: "auth.setup.ts" },
		{
			name: "chromium",
			testIgnore: "auth.setup.ts",
			dependencies: ["setup"],
			use: { ...devices["Desktop Chrome"], storageState: AUTH_FILE },
		},
	],
});
