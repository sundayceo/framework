import { describe, expect, test } from "vitest";

import { generateRouteMap } from "./codegen-routes";

describe("generateRouteMap", () => {
	test("generates empty RouteMap for empty input", () => {
		const result = generateRouteMap([]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"  interface RouteMap {",
				"  }",
				"}",
				"",
			].join("\n"),
		);
	});

	test("converts index.tsx to root route /", () => {
		const result = generateRouteMap(["index.tsx"]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"  interface RouteMap {",
				'    "/": {};',
				"  }",
				"}",
				"",
			].join("\n"),
		);
	});

	test("converts static route file to route path", () => {
		const result = generateRouteMap(["about.tsx"]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"  interface RouteMap {",
				'    "/about": {};',
				"  }",
				"}",
				"",
			].join("\n"),
		);
	});

	test("extracts single dynamic param", () => {
		const result = generateRouteMap(["blog/[slug].tsx"]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"  interface RouteMap {",
				'    "/blog/[slug]": { slug: string };',
				"  }",
				"}",
				"",
			].join("\n"),
		);
	});

	test("extracts multiple dynamic params", () => {
		const result = generateRouteMap(["products/[category]/[id].tsx"]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"  interface RouteMap {",
				'    "/products/[category]/[id]": { category: string; id: string };',
				"  }",
				"}",
				"",
			].join("\n"),
		);
	});

	test("handles nested static routes", () => {
		const result = generateRouteMap(["docs/getting-started.tsx"]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"  interface RouteMap {",
				'    "/docs/getting-started": {};',
				"  }",
				"}",
				"",
			].join("\n"),
		);
	});

	test("handles nested index.tsx as parent path", () => {
		const result = generateRouteMap(["blog/index.tsx"]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"  interface RouteMap {",
				'    "/blog": {};',
				"  }",
				"}",
				"",
			].join("\n"),
		);
	});

	test("sorts routes alphabetically", () => {
		const result = generateRouteMap([
			"blog/[slug].tsx",
			"index.tsx",
			"about.tsx",
			"products/[category]/[id].tsx",
		]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"  interface RouteMap {",
				'    "/": {};',
				'    "/about": {};',
				'    "/blog/[slug]": { slug: string };',
				'    "/products/[category]/[id]": { category: string; id: string };',
				"  }",
				"}",
				"",
			].join("\n"),
		);
	});

	test("filters out non-.tsx files", () => {
		const result = generateRouteMap([
			"about.tsx",
			"utils.ts",
			"styles.css",
			"readme.md",
		]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"  interface RouteMap {",
				'    "/about": {};',
				"  }",
				"}",
				"",
			].join("\n"),
		);
	});
});
