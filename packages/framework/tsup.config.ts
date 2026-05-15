import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/vite-plugin.ts", "src/hono.ts"],
	format: ["esm"],
	dts: true,
	clean: true,
	external: ["react", "react-dom", "vite", "hono"],
});
