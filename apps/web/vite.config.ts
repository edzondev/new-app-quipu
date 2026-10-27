import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	ssr: {
		noExternal: ["@convex-dev/better-auth"],
		// base-ui deep imports break Cloudflare SSR dep optimizer (missing deps_ssr chunks)
		optimizeDeps: {
			exclude: ["@base-ui/react", "@base-ui/react/merge-props", "@base-ui/react/use-render"],
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
