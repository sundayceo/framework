import { resolve } from "node:path";

import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vite";

import * as sourceConfig from "./source.config";

export default defineConfig({
	server: { port: 3000 },
	resolve: {
		dedupe: ["react", "react-dom"],
		alias: {
			tslib: "tslib/tslib.es6.js",
			"collections/server": resolve(import.meta.dirname, ".source/server.ts"),
			"collections/browser": resolve(import.meta.dirname, ".source/browser.ts"),
		},
		tsconfigPaths: true,
	},
	plugins: [
		mdx(sourceConfig),
		tailwindcss(),
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tanstackStart({ prerender: { enabled: true } }),
		react(),
	],
});
