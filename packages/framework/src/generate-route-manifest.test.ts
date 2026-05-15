import { describe, expect, test } from "vitest";

import { generateRouteManifest } from "./generate-route-manifest";

describe("generateRouteManifest", () => {
	test("generates route entry for static index route", () => {
		const result = generateRouteManifest({
			routePaths: ["index.tsx"],
			templatePaths: [],
		});

		expect(result).toContain('{ pattern: "/", params: [], load: () => import("./routes/index") },');
	});

	test("generates route entry for nested route", () => {
		const result = generateRouteManifest({
			routePaths: ["api/health.tsx"],
			templatePaths: [],
		});

		expect(result).toContain(
			'{ pattern: "/api/health", params: [], load: () => import("./routes/api/health") },',
		);
	});

	test("generates route entry with dynamic params", () => {
		const result = generateRouteManifest({
			routePaths: ["blog/[slug].tsx"],
			templatePaths: [],
		});

		expect(result).toContain(
			'{ pattern: "/blog/:slug", params: ["slug"], load: () => import("./routes/blog/[slug]") },',
		);
	});

	test("sorts static routes before dynamic routes", () => {
		const result = generateRouteManifest({
			routePaths: ["blog/[slug].tsx", "index.tsx", "about.tsx"],
			templatePaths: [],
		});

		const lines = result.split("\n");
		const routeLines = lines.filter((l) => l.includes("pattern:"));

		expect(routeLines.at(0)).toContain('pattern: "/"');
		expect(routeLines.at(1)).toContain('pattern: "/about"');
		expect(routeLines.at(2)).toContain('pattern: "/blog/:slug"');
	});

	test("generates template map", () => {
		const result = generateRouteManifest({
			routePaths: [],
			templatePaths: ["default.tsx"],
		});

		expect(result).toContain('default: () => import("./templates/default"),');
	});

	test("generates complete valid output", () => {
		const result = generateRouteManifest({
			routePaths: ["index.tsx", "api/health.tsx", "demo.tsx"],
			templatePaths: ["default.tsx"],
		});

		const expected = [
			"// src/routes.gen.ts (generated — do not edit)",
			"export const routes = [",
			'  { pattern: "/", params: [], load: () => import("./routes/index") },',
			'  { pattern: "/api/health", params: [], load: () => import("./routes/api/health") },',
			'  { pattern: "/demo", params: [], load: () => import("./routes/demo") },',
			"];",
			"",
			"export const templates = {",
			'  default: () => import("./templates/default"),',
			"};",
			"",
		].join("\n");

		expect(result).toBe(expected);
	});

	test("handles multiple dynamic params", () => {
		const result = generateRouteManifest({
			routePaths: ["products/[category]/[id].tsx"],
			templatePaths: [],
		});

		expect(result).toContain(
			'{ pattern: "/products/:category/:id", params: ["category", "id"], load: () => import("./routes/products/[category]/[id]") },',
		);
	});

	test("handles multiple templates sorted alphabetically", () => {
		const result = generateRouteManifest({
			routePaths: [],
			templatePaths: ["sidebar.tsx", "default.tsx"],
		});

		const lines = result.split("\n");
		const templateLines = lines.filter((l) => l.includes("import("));

		expect(templateLines.at(0)).toContain("default:");
		expect(templateLines.at(1)).toContain("sidebar:");
	});
});
