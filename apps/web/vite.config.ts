import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	ssr: { noExternal: ["@convex-dev/better-auth"] },
	// Cloudflare SSR can resolve two React copies; force one via deps_ssr.
	// https://github.com/TanStack/router/issues/7119
	environments: {
		ssr: {
			optimizeDeps: {
				include: [
					"react",
					"react-dom",
					"react-dom/server",
					"react/jsx-runtime",
					"react/jsx-dev-runtime",
					// Base UI is excluded below, so its CJS dependency must be pre-bundled or workerd fails with "module is not defined".
					"@base-ui/react > use-sync-external-store/shim",
					"@base-ui/react > use-sync-external-store/shim/with-selector",
				],
				exclude: ["@base-ui/react", "@base-ui/react/merge-props", "@base-ui/react/use-render"],
			},
		},
	},
	plugins: [
		devtools(),
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
