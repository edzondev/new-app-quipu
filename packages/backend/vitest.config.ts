import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "edge-runtime",
		include: ["__tests__/**/*.test.ts"],
		testTimeout: 20_000,
	},
});
