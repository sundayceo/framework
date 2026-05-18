import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/vite-plugin.ts"],
	format: ["esm"],
	dts: {
		compilerOptions: {
			types: ["node"],
		},
	},
	clean: true,
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
