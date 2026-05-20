import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { buildImportGraph, extractImportSpecifiers, resolveFile } from "./import-graph";

describe("extractImportSpecifiers", () => {
	test("extracts relative imports", () => {
		const source = `import { Foo } from "./foo";\nimport { Bar } from "./bar";`;
		expect(extractImportSpecifiers(source)).toEqual(["./foo", "./bar"]);
	});

	test("ignores non-relative imports", () => {
		const source = `import React from "react";\nimport { Foo } from "./foo";`;
		expect(extractImportSpecifiers(source)).toEqual(["./foo"]);
	});

	test("returns empty array for no imports", () => {
		expect(extractImportSpecifiers("const x = 1;")).toEqual([]);
	});

	test("handles parent directory imports", () => {
		const source = `import { Shared } from "../shared/utils";`;
		expect(extractImportSpecifiers(source)).toEqual(["../shared/utils"]);
	});

	test("skips type-only imports", () => {
		const source = `import type { Props } from "./types";\nimport { Button } from "./button";`;
		expect(extractImportSpecifiers(source)).toEqual(["./button"]);
	});

	test("includes inline type imports (import { type X })", () => {
		const source = `import { type Props, Button } from "./button";`;
		expect(extractImportSpecifiers(source)).toEqual(["./button"]);
	});
});

describe("resolveFile", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-"));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	test("resolves .ts file", () => {
		fs.writeFileSync(path.join(tmpDir, "foo.ts"), "");
		expect(resolveFile("./foo", tmpDir)).toBe(path.join(tmpDir, "foo.ts"));
	});

	test("resolves .tsx file", () => {
		fs.writeFileSync(path.join(tmpDir, "bar.tsx"), "");
		expect(resolveFile("./bar", tmpDir)).toBe(path.join(tmpDir, "bar.tsx"));
	});

	test("resolves index file in directory", () => {
		fs.mkdirSync(path.join(tmpDir, "utils"));
		fs.writeFileSync(path.join(tmpDir, "utils", "index.ts"), "");
		expect(resolveFile("./utils", tmpDir)).toBe(path.join(tmpDir, "utils", "index.ts"));
	});

	test("returns undefined for missing file", () => {
		expect(resolveFile("./missing", tmpDir)).toBeUndefined();
	});

	test("prefers direct file over index file", () => {
		fs.writeFileSync(path.join(tmpDir, "shared.tsx"), "direct");
		fs.mkdirSync(path.join(tmpDir, "shared"));
		fs.writeFileSync(path.join(tmpDir, "shared", "index.tsx"), "index");
		expect(resolveFile("./shared", tmpDir)).toBe(path.join(tmpDir, "shared.tsx"));
	});
});

describe("buildImportGraph", () => {
	let tmpDir: string;
	let routesDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graph-"));
		routesDir = path.join(tmpDir, "routes");
		fs.mkdirSync(routesDir, { recursive: true });
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	test("builds graph for route with local import", () => {
		const componentDir = path.join(tmpDir, "components");
		fs.mkdirSync(componentDir);
		fs.writeFileSync(path.join(componentDir, "button.tsx"), "export function Button() {}");

		fs.writeFileSync(
			path.join(routesDir, "index.tsx"),
			'import { Button } from "../components/button";',
		);

		const routeSources = { "/": 'import { Button } from "../components/button";' };
		const graph = buildImportGraph(routeSources, routesDir);

		expect(graph["../components/button"]).toContain("Button");
	});

	test("follows transitive imports", () => {
		const libDir = path.join(tmpDir, "lib");
		fs.mkdirSync(libDir);
		fs.writeFileSync(path.join(libDir, "a.ts"), 'import { b } from "./b";\nexport const a = b;');
		fs.writeFileSync(path.join(libDir, "b.ts"), "export const b = 42;");

		fs.writeFileSync(path.join(routesDir, "index.tsx"), 'import { a } from "../lib/a";');

		const routeSources = { "/": 'import { a } from "../lib/a";' };
		const graph = buildImportGraph(routeSources, routesDir);

		expect(graph["../lib/a"]).toContain("a");
		expect(graph["./b"]).toContain("b = 42");
	});

	test("handles missing imports gracefully", () => {
		fs.writeFileSync(path.join(routesDir, "index.tsx"), 'import { Missing } from "../missing";');

		const routeSources = { "/": 'import { Missing } from "../missing";' };
		const graph = buildImportGraph(routeSources, routesDir);

		expect(Object.keys(graph)).toHaveLength(0);
	});

	test("avoids circular imports", () => {
		const libDir = path.join(tmpDir, "lib");
		fs.mkdirSync(libDir);
		fs.writeFileSync(path.join(libDir, "a.ts"), 'import { b } from "./b";\nexport const a = 1;');
		fs.writeFileSync(path.join(libDir, "b.ts"), 'import { a } from "./a";\nexport const b = 2;');

		fs.writeFileSync(path.join(routesDir, "index.tsx"), 'import { a } from "../lib/a";');

		const routeSources = { "/": 'import { a } from "../lib/a";' };
		const graph = buildImportGraph(routeSources, routesDir);

		expect(graph["../lib/a"]).toBeDefined();
		expect(graph["./b"]).toBeDefined();
	});

	test("returns empty graph for no imports", () => {
		const routeSources = { "/": "export default function Home() { return 'hi'; }" };
		const graph = buildImportGraph(routeSources, routesDir);

		expect(Object.keys(graph)).toHaveLength(0);
	});
});
