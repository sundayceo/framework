import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { runCodegen } from "./run-codegen";

function createFixtureDir(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codegen-"));
	fs.mkdirSync(path.join(dir, "routes"), { recursive: true });
	fs.mkdirSync(path.join(dir, "templates"), { recursive: true });
	return dir;
}

describe("runCodegen", () => {
	let srcDir: string;

	beforeEach(() => {
		srcDir = createFixtureDir();
	});

	afterEach(() => {
		fs.rmSync(srcDir, { recursive: true, force: true });
	});

	test("returns declarations and manifest for a fixture directory", () => {
		fs.writeFileSync(path.join(srcDir, "routes", "index.tsx"), "");
		fs.writeFileSync(path.join(srcDir, "templates", "default.tsx"), "");

		const result = runCodegen(srcDir);

		expect(result).toHaveProperty("declarations");
		expect(result).toHaveProperty("manifest");
		expect(typeof result.declarations).toBe("string");
		expect(typeof result.manifest).toBe("string");
	});

	test("declarations contain both route map and template registry", () => {
		fs.writeFileSync(path.join(srcDir, "routes", "index.tsx"), "");
		fs.writeFileSync(path.join(srcDir, "routes", "about.tsx"), "");
		fs.writeFileSync(path.join(srcDir, "routes", "[slug].tsx"), "");
		fs.writeFileSync(path.join(srcDir, "templates", "marketing.tsx"), "");
		fs.writeFileSync(path.join(srcDir, "templates", "blog.tsx"), "");

		const { declarations } = runCodegen(srcDir);

		expect(declarations).toContain("interface TemplateRegistry {");
		expect(declarations).toContain('blog: typeof import("./templates/blog").default;');
		expect(declarations).toContain('marketing: typeof import("./templates/marketing").default;');

		expect(declarations).toContain("interface RouteMap {");
		expect(declarations).toContain('"/": {};');
		expect(declarations).toContain('"/about": {};');
		expect(declarations).toContain('"/[slug]": { slug: string };');

		const moduleCount = (declarations.match(/declare module "@sundayceo\/framework"/g) ?? [])
			.length;
		expect(moduleCount).toBe(2);
	});

	test("manifest contains route entries with lazy imports and template map", () => {
		fs.writeFileSync(path.join(srcDir, "routes", "index.tsx"), "");
		fs.writeFileSync(path.join(srcDir, "routes", "about.tsx"), "");
		fs.mkdirSync(path.join(srcDir, "routes", "blog"), { recursive: true });
		fs.writeFileSync(path.join(srcDir, "routes", "blog", "[slug].tsx"), "");
		fs.writeFileSync(path.join(srcDir, "templates", "default.tsx"), "");

		const { manifest } = runCodegen(srcDir);

		expect(manifest).toContain("export const routes = [");
		expect(manifest).toContain('pattern: "/", params: [], load: () => import("./routes/index")');
		expect(manifest).toContain(
			'pattern: "/about", params: [], load: () => import("./routes/about")',
		);
		expect(manifest).toContain(
			'pattern: "/blog/:slug", params: ["slug"], load: () => import("./routes/blog/[slug]")',
		);

		expect(manifest).toContain("export const templates = {");
		expect(manifest).toContain('default: () => import("./templates/default")');
	});

	test("handles empty directories gracefully", () => {
		const result = runCodegen(srcDir);

		expect(result.declarations).toContain("interface TemplateRegistry {");
		expect(result.declarations).toContain("interface RouteMap {");
		expect(result.manifest).toContain("export const routes = [");
		expect(result.manifest).toContain("export const templates = {");
	});

	test("handles missing directories gracefully", () => {
		const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "codegen-empty-"));

		const result = runCodegen(emptyDir);

		expect(result.declarations).toContain("interface TemplateRegistry {");
		expect(result.declarations).toContain("interface RouteMap {");

		fs.rmSync(emptyDir, { recursive: true, force: true });
	});

	test("excludes error page files from RouteMap declarations", () => {
		fs.writeFileSync(path.join(srcDir, "routes", "index.tsx"), "");
		fs.writeFileSync(path.join(srcDir, "routes", "404.tsx"), "");
		fs.writeFileSync(path.join(srcDir, "routes", "500.tsx"), "");
		fs.writeFileSync(path.join(srcDir, "routes", "about.tsx"), "");

		const { declarations } = runCodegen(srcDir);

		expect(declarations).toContain('"/": {};');
		expect(declarations).toContain('"/about": {};');
		expect(declarations).not.toContain("404");
		expect(declarations).not.toContain("500");
	});

	test("keeps non-error numeric files in RouteMap declarations", () => {
		fs.writeFileSync(path.join(srcDir, "routes", "200.tsx"), "");
		fs.writeFileSync(path.join(srcDir, "routes", "301.tsx"), "");

		const { declarations } = runCodegen(srcDir);

		expect(declarations).toContain('"/200": {};');
		expect(declarations).toContain('"/301": {};');
	});

	test("emits errorPages export with lazy imports keyed by status code", () => {
		fs.writeFileSync(path.join(srcDir, "routes", "index.tsx"), "");
		fs.writeFileSync(path.join(srcDir, "routes", "404.tsx"), "");
		fs.writeFileSync(path.join(srcDir, "routes", "500.tsx"), "");

		const { manifest } = runCodegen(srcDir);

		expect(manifest).toContain("export const errorPages = {");
		expect(manifest).toContain('404: () => import("./routes/404")');
		expect(manifest).toContain('500: () => import("./routes/500")');
	});

	test("excludes error pages from routes array in manifest", () => {
		fs.writeFileSync(path.join(srcDir, "routes", "index.tsx"), "");
		fs.writeFileSync(path.join(srcDir, "routes", "404.tsx"), "");

		const { manifest } = runCodegen(srcDir);

		const lines = manifest.split("\n");
		const routeLines = lines.filter((l) => l.includes("pattern:"));

		expect(routeLines).toHaveLength(1);
		expect(routeLines.at(0)).toContain('pattern: "/"');
	});
});
