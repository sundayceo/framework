import { describe, expect, test } from "vitest";

import { createClientBuildConfig, createServerBuildConfig } from "./build-config";

describe("createClientBuildConfig", () => {
	test("uses interactive entries as input", () => {
		const config = createClientBuildConfig({
			entries: ["virtual:hydrate/demo/main", "virtual:hydrate/blog/content"],
			outDir: "dist/client",
		});

		expect(config.build?.rolldownOptions?.input).toEqual([
			"virtual:hydrate/demo/main",
			"virtual:hydrate/blog/content",
		]);
	});

	test("outputs to specified directory", () => {
		const config = createClientBuildConfig({
			entries: ["virtual:hydrate/demo/main"],
			outDir: "dist/client",
		});

		expect(config.build?.outDir).toBe("dist/client");
	});

	test("enables manifest generation", () => {
		const config = createClientBuildConfig({
			entries: ["virtual:hydrate/demo/main"],
			outDir: "dist/client",
		});

		expect(config.build?.manifest).toBe(true);
	});

	test("configures vendor code splitting for React", () => {
		const config = createClientBuildConfig({
			entries: ["virtual:hydrate/demo/main"],
			outDir: "dist/client",
		});

		const output = config.build?.rolldownOptions?.output;
		const codeSplitting = !Array.isArray(output) ? output?.codeSplitting : undefined;

		expect(typeof codeSplitting).toBe("object");

		const { groups } = codeSplitting as {
			groups: { name: string; test: (id: string) => boolean }[];
		};
		expect(groups).toHaveLength(1);
		const vendorGroup = groups.at(0);
		expect(vendorGroup?.name).toBe("vendor");
		expect(vendorGroup?.test("node_modules/react/index.js")).toBe(true);
		expect(vendorGroup?.test("node_modules/react-dom/client.js")).toBe(true);
		expect(vendorGroup?.test("src/components/Counter.tsx")).toBe(false);
	});
});

describe("createServerBuildConfig", () => {
	test("sets SSR entry point", () => {
		const config = createServerBuildConfig({
			entry: "src/entry.ts",
			outDir: "dist/server",
		});

		expect(config.build?.ssr).toBe("src/entry.ts");
	});

	test("outputs to specified directory", () => {
		const config = createServerBuildConfig({
			entry: "src/entry.ts",
			outDir: "dist/server",
		});

		expect(config.build?.outDir).toBe("dist/server");
	});
});
