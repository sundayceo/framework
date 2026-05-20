import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/codegen/index.ts", "src/vite/vite-plugin.ts", "src/cli.ts"],
	format: ["esm"],
	dts: {
		compilerOptions: {
			types: ["node"],
		},
	},
	clean: true,
	async onSuccess() {
		const { readFileSync, writeFileSync } = await import("node:fs");
		const cliPath = "dist/cli.js";
		const content = readFileSync(cliPath, "utf-8");
		if (!content.startsWith("#!")) {
			writeFileSync(cliPath, `#!/usr/bin/env node\n${content}`);
		}
	},
	external: [
		"react",
		"react-dom",
		"vite",
		"@babel/generator",
		"@babel/parser",
		"@babel/traverse",
		"@babel/types",
	],
});
