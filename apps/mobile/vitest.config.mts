import { defineConfig } from "vitest/config";

// Only pure logic is tested here (no react-native, no expo-*): Vitest runs in Node.
export default defineConfig({
	resolve: { alias: { "@": "/src" } },
	test: { include: ["src/**/*.test.ts"] },
});
