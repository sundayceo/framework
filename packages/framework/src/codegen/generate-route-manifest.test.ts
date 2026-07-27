import { parse } from "@babel/parser";
import { describe, expect, test } from "vitest";

import { generateRouteManifest } from "./generate-route-manifest";

function parseManifest(source: string): void {
	parse(source, { sourceType: "module", plugins: ["typescript"] });
}

describe("generateRouteManifest", () => {
	test("generates route entries with import paths", () => {
		const result = generateRouteManifest({
			routePaths: ["index.tsx", "about.tsx"],
			templatePaths: ["default.tsx"],
		});

		expect(result).toContain("export const routes = [");
		expect(result).toContain('routePath: "/"');
		expect(result).toContain('routePath: "/about"');
		expect(result).toContain('import("./routes/index")');
		expect(result).toContain('import("./routes/about")');
	});

	test("generates template entries", () => {
		const result = generateRouteManifest({
			routePaths: ["index.tsx"],
			templatePaths: ["default.tsx"],
		});

		expect(result).toContain("export const templates = {");
		expect(result).toContain('"default": () => import("./templates/default")');
	});

	test("separates error pages from regular routes", () => {
		const result = generateRouteManifest({
			routePaths: ["index.tsx", "404.tsx", "500.tsx"],
			templatePaths: ["default.tsx"],
		});

		expect(result).toContain("export const errorPages = {");
		expect(result).toContain('404: () => import("./routes/404")');
		expect(result).toContain('500: () => import("./routes/500")');
	});

	test("includes hydration manifest when provided", () => {
		const result = generateRouteManifest({
			routePaths: ["index.tsx", "demo.tsx"],
			templatePaths: ["default.tsx"],
			hydrationManifest: { "/": { main: false }, "/demo": { main: true } },
		});

		expect(result).toContain("export const hydrationManifest =");
		expect(result).toContain('"main": true');
	});

	test("defaults to empty hydration manifest", () => {
		const result = generateRouteManifest({
			routePaths: ["index.tsx"],
			templatePaths: ["default.tsx"],
		});

		expect(result).toContain("export const hydrationManifest = {};");
	});

	test("formats params array for dynamic routes", () => {
		const result = generateRouteManifest({
			routePaths: ["blog/[slug].tsx"],
			templatePaths: ["default.tsx"],
		});

		expect(result).toContain('params: ["slug"]');
	});

	test("route groups strip from URL but preserve import path", () => {
		const result = generateRouteManifest({
			routePaths: ["(marketing)/about.tsx"],
			templatePaths: [],
		});

		expect(result).toContain('routePath: "/about"');
		expect(result).toContain('import("./routes/(marketing)/about")');
	});

	test("hydration manifest keys use scanner format not bracket format", () => {
		const result = generateRouteManifest({
			routePaths: ["blog/[slug].tsx", "docs/[...slug].tsx"],
			templatePaths: [],
			hydrationManifest: {
				"/blog/[slug]": { main: true },
				"/docs/[...slug]": { content: false },
			},
		});

		expect(result).toContain('"/blog/:slug"');
		expect(result).toContain('"/docs/*slug"');
		expect(result).not.toContain('"/blog/[slug]"');
		expect(result).not.toContain('"/docs/[...slug]"');
	});

	test("sorts multiple template entries alphabetically", () => {
		const result = generateRouteManifest({
			routePaths: ["index.tsx"],
			templatePaths: ["wide.tsx", "default.tsx"],
		});

		const defaultIdx = result.indexOf('"default":');
		const wideIdx = result.indexOf('"wide":');
		expect(defaultIdx).toBeLessThan(wideIdx);
	});

	test("filters out non-tsx template files", () => {
		const result = generateRouteManifest({
			routePaths: ["index.tsx"],
			templatePaths: ["default.tsx", "readme.md"],
		});

		expect(result).toContain('"default":');
		expect(result).not.toContain("readme");
	});

	test("quotes kebab-case template names", () => {
		const result = generateRouteManifest({
			routePaths: ["index.tsx"],
			templatePaths: ["blog-post.tsx"],
		});

		expect(result).toContain('"blog-post": () => import("./templates/blog-post")');
	});

	test("produces parseable output for template names that are not bare identifiers", () => {
		const result = generateRouteManifest({
			routePaths: ["index.tsx", "404.tsx"],
			templatePaths: ["blog-post.tsx", "2col.tsx", "my template.tsx"],
		});

		expect(() => {
			parseManifest(result);
		}).not.toThrow();
	});

	test("produces parseable output for identifier-safe template names", () => {
		const result = generateRouteManifest({
			routePaths: ["index.tsx", "404.tsx"],
			templatePaths: ["default.tsx", "wide.tsx"],
		});

		expect(() => {
			parseManifest(result);
		}).not.toThrow();
	});

	test("catch-all routes use wildcard pattern", () => {
		const result = generateRouteManifest({
			routePaths: ["docs/[...slug].tsx"],
			templatePaths: [],
		});

		expect(result).toContain('routePath: "/docs/*slug"');
		expect(result).toContain('params: ["slug"]');
	});
});
