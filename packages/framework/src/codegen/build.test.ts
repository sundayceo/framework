import { describe, expect, test } from "vitest";

import { codegen } from "./build";

describe("codegen", () => {
	test("generates declarations with route map and template registry", () => {
		const { declarations } = codegen({
			routePaths: ["index.tsx", "about.tsx", "[slug].tsx"],
			templatePaths: ["default.tsx", "blog.tsx"],
		});

		expect(declarations).toContain("interface RouteMap {");
		expect(declarations).toContain('"/": {};');
		expect(declarations).toContain('"/about": {};');
		expect(declarations).toContain('"/[slug]": { slug: string };');

		expect(declarations).toContain("interface TemplateRegistry {");
		expect(declarations).toContain('blog: typeof import("./templates/blog").default;');
		expect(declarations).toContain('default: typeof import("./templates/default").default;');
	});

	test("generates manifest with route entries and template map", () => {
		const { manifest } = codegen({
			routePaths: ["index.tsx", "about.tsx"],
			templatePaths: ["default.tsx"],
		});

		expect(manifest).toContain("export const routes = [");
		expect(manifest).toContain(
			'routePath: "/", params: [], loadModule: () => import("./routes/index")',
		);
		expect(manifest).toContain(
			'routePath: "/about", params: [], loadModule: () => import("./routes/about")',
		);

		expect(manifest).toContain("export const templates = {");
		expect(manifest).toContain('default: () => import("./templates/default")');
	});

	test("handles empty input", () => {
		const result = codegen({ routePaths: [], templatePaths: [] });

		expect(result.declarations).toContain("interface RouteMap {");
		expect(result.declarations).toContain("interface TemplateRegistry {");
		expect(result.manifest).toContain("export const routes = [");
		expect(result.manifest).toContain("export const templates = {");
	});

	test("excludes error pages from route map and routes array", () => {
		const { declarations, manifest } = codegen({
			routePaths: ["index.tsx", "404.tsx", "500.tsx"],
			templatePaths: [],
		});

		expect(declarations).toContain('"/": {};');
		expect(declarations).not.toContain("404");
		expect(declarations).not.toContain("500");

		expect(manifest).toContain("export const errorPages = {");
		expect(manifest).toContain('404: () => import("./routes/404")');
		expect(manifest).toContain('500: () => import("./routes/500")');

		const routeLines = manifest.split("\n").filter((l) => l.includes("routePath:"));
		expect(routeLines).toHaveLength(1);
	});
});
