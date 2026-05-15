import { describe, expect, test } from "vitest";

import { generateRouteMap } from "./codegen-routes";

describe("generateRouteMap", () => {
	test("generates empty RouteMap for empty input", () => {
		const result = generateRouteMap([]);

		expect(result).toBe(
			['declare module "@sundayceo/framework" {', "\tinterface RouteMap {", "\t}", "}", ""].join(
				"\n",
			),
		);
	});

	test("converts index.tsx to root route /", () => {
		const result = generateRouteMap(["index.tsx"]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"\tinterface RouteMap {",
				'\t\t"/": {};',
				"\t}",
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
				"\tinterface RouteMap {",
				'\t\t"/about": {};',
				"\t}",
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
				"\tinterface RouteMap {",
				'\t\t"/blog/[slug]": { slug: string };',
				"\t}",
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
				"\tinterface RouteMap {",
				'\t\t"/products/[category]/[id]": { category: string; id: string };',
				"\t}",
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
				"\tinterface RouteMap {",
				'\t\t"/docs/getting-started": {};',
				"\t}",
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
				"\tinterface RouteMap {",
				'\t\t"/blog": {};',
				"\t}",
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
				"\tinterface RouteMap {",
				'\t\t"/": {};',
				'\t\t"/about": {};',
				'\t\t"/blog/[slug]": { slug: string };',
				'\t\t"/products/[category]/[id]": { category: string; id: string };',
				"\t}",
				"}",
				"",
			].join("\n"),
		);
	});

	test("accepts both .tsx and .ts route files", () => {
		const result = generateRouteMap(["about.tsx", "api/health.ts"]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"\tinterface RouteMap {",
				'\t\t"/about": {};',
				'\t\t"/api/health": {};',
				"\t}",
				"}",
				"",
			].join("\n"),
		);
	});

	test("filters out non-route files", () => {
		const result = generateRouteMap(["about.tsx", "styles.css", "readme.md"]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"\tinterface RouteMap {",
				'\t\t"/about": {};',
				"\t}",
				"}",
				"",
			].join("\n"),
		);
	});
});
