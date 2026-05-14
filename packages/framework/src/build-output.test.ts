import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const DIST = resolve(import.meta.dirname, "..", "dist");
const PKG_PATH = resolve(import.meta.dirname, "..", "package.json");

type PackageExportConditions = {
	types: string;
	import: string;
};

type PackageJson = {
	exports: Record<string, PackageExportConditions>;
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

	test("dist contains vite-plugin.js", () => {
		expect(existsSync(resolve(DIST, "vite-plugin.js"))).toBe(true);
	});

	test("dist contains vite-plugin.d.ts", () => {
		expect(existsSync(resolve(DIST, "vite-plugin.d.ts"))).toBe(true);
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

	test("vite export points to dist/vite-plugin", async () => {
		const pkg = await readPackageJson();
		expect(pkg.exports["./vite"]).toStrictEqual({
			types: "./dist/vite-plugin.d.ts",
			import: "./dist/vite-plugin.js",
		});
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

	test("files field includes only dist", async () => {
		const pkg = await readPackageJson();
		expect(pkg.files).toStrictEqual(["dist"]);
	});

	test("publishConfig sets public access", async () => {
		const pkg = await readPackageJson();
		expect(pkg.publishConfig.access).toBe("public");
	});
});
