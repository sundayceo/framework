import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const DIST = resolve(import.meta.dirname, "..", "dist");
const PKG_PATH = resolve(import.meta.dirname, "..", "package.json");

type PackageJson = {
	exports: Record<string, Record<string, string>>;
	peerDependencies: Record<string, string>;
	files: string[];
	publishConfig: { access: string };
};

async function readPackageJson(): Promise<PackageJson> {
	const raw = await readFile(PKG_PATH, "utf8");
	return JSON.parse(raw) as PackageJson;
}

describe("build output", () => {
	test("dist contains index.js", () => {
		expect(existsSync(resolve(DIST, "index.js"))).toBe(true);
	});

	test("dist contains index.d.ts", () => {
		expect(existsSync(resolve(DIST, "index.d.ts"))).toBe(true);
	});

	test("dist contains codegen/index.js", () => {
		expect(existsSync(resolve(DIST, "codegen", "index.js"))).toBe(true);
	});

	test("dist contains codegen/index.d.ts", () => {
		expect(existsSync(resolve(DIST, "codegen", "index.d.ts"))).toBe(true);
	});

	test("dist contains vite/vite-plugin.js", () => {
		expect(existsSync(resolve(DIST, "vite", "vite-plugin.js"))).toBe(true);
	});

	test("dist contains vite/vite-plugin.d.ts", () => {
		expect(existsSync(resolve(DIST, "vite", "vite-plugin.d.ts"))).toBe(true);
	});
});

describe("package.json exports map", () => {
	test("root export points to dist/index", async () => {
		const pkg = await readPackageJson();
		expect(pkg.exports["."]).toStrictEqual({
			types: "./dist/index.d.ts",
			import: "./dist/index.js",
		});
	});

	test("codegen export points to dist/codegen/index", async () => {
		const pkg = await readPackageJson();
		expect(pkg.exports["./codegen"]).toStrictEqual({
			types: "./dist/codegen/index.d.ts",
			import: "./dist/codegen/index.js",
		});
	});

	test("vite export points to dist/vite/vite-plugin", async () => {
		const pkg = await readPackageJson();
		expect(pkg.exports["./vite"]).toStrictEqual({
			types: "./dist/vite/vite-plugin.d.ts",
			import: "./dist/vite/vite-plugin.js",
		});
	});

	test("server-entry export provides types and stub import", async () => {
		const pkg = await readPackageJson();
		expect(pkg.exports["./server-entry"]).toStrictEqual({
			types: "./src/vite/server-entry.d.ts",
			import: "./src/vite/server-entry-stub.js",
		});
	});

	test("has no build subpath export", async () => {
		const pkg = await readPackageJson();
		expect(pkg.exports["./build"]).toBeUndefined();
	});

	test("has no cloudflare subpath export", async () => {
		const pkg = await readPackageJson();
		expect(pkg.exports["./cloudflare"]).toBeUndefined();
	});
});

describe("package.json publish config", () => {
	test("declares react as peer dependency", async () => {
		const pkg = await readPackageJson();
		expect(pkg.peerDependencies.react).toBeDefined();
	});

	test("declares react-dom as peer dependency", async () => {
		const pkg = await readPackageJson();
		expect(pkg.peerDependencies["react-dom"]).toBeDefined();
	});

	test("declares vite as peer dependency", async () => {
		const pkg = await readPackageJson();
		expect(pkg.peerDependencies.vite).toBeDefined();
	});

	test("files field includes dist and server-entry source files", async () => {
		const pkg = await readPackageJson();
		expect(pkg.files).toStrictEqual([
			"dist",
			"src/vite/server-entry-stub.js",
			"src/vite/server-entry.d.ts",
		]);
	});

	test("no bin field when CLI is not yet implemented", async () => {
		const pkg = await readPackageJson();
		expect((pkg as Record<string, unknown>).bin).toBeUndefined();
	});

	test("publishConfig sets public access", async () => {
		const pkg = await readPackageJson();
		expect(pkg.publishConfig.access).toBe("public");
	});
});
