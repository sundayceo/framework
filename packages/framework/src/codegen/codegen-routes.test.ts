import { describe, expect, test } from "vitest";

import { generateRouteMap } from "./codegen-routes";

describe("generateRouteMap", () => {
	test("generates declaration for static routes", () => {
		const result = generateRouteMap(["index.tsx", "about.tsx"]);

		expect(result).toContain("interface RouteMap");
		expect(result).toContain('"/": {};');
		expect(result).toContain('"/about": {};');
	});

	test("generates param types for dynamic routes", () => {
		const result = generateRouteMap(["blog/[slug].tsx"]);

		expect(result).toContain('"/blog/[slug]": { slug: string };');
	});

	test("generates multiple param types for nested dynamic routes", () => {
		const result = generateRouteMap(["users/[id]/posts/[postId].tsx"]);

		expect(result).toContain("{ id: string; postId: string }");
	});

	test("filters out test files", () => {
		const result = generateRouteMap(["about.tsx", "about.test.tsx"]);

		expect(result).not.toContain("test");
		expect(result).toContain("/about");
	});

	test("filters out error page files", () => {
		const result = generateRouteMap(["about.tsx", "404.tsx", "500.tsx"]);

		expect(result).not.toContain("404");
		expect(result).not.toContain("500");
		expect(result).toContain("/about");
	});

	test("filters out non-ts/tsx files", () => {
		const result = generateRouteMap(["about.tsx", "readme.md"]);

		expect(result).not.toContain("readme");
	});

	test("treats index files as directory root", () => {
		const result = generateRouteMap(["blog/index.tsx"]);

		expect(result).toContain('"/blog": {};');
	});

	test("sorts routes alphabetically", () => {
		const result = generateRouteMap(["z.tsx", "a.tsx", "m.tsx"]);
		const aIndex = result.indexOf("/a");
		const mIndex = result.indexOf("/m");
		const zIndex = result.indexOf("/z");

		expect(aIndex).toBeLessThan(mIndex);
		expect(mIndex).toBeLessThan(zIndex);
	});

	test("wraps in module declaration", () => {
		const result = generateRouteMap(["index.tsx"]);

		expect(result).toContain('declare module "@sundayceo/framework"');
		expect(result).toContain("interface RouteMap");
	});

	test("generates catch-all route with string param type", () => {
		const result = generateRouteMap(["docs/[...slug].tsx"]);

		expect(result).toContain('"/docs/[...slug]": { slug: string };');
	});

	test("generates top-level catch-all route", () => {
		const result = generateRouteMap(["[...path].tsx"]);

		expect(result).toContain('"/[...path]": { path: string };');
	});

	test("strips route group folders from type declarations", () => {
		const result = generateRouteMap(["(marketing)/about.tsx", "(marketing)/pricing.tsx"]);

		expect(result).toContain('"/about": {};');
		expect(result).toContain('"/pricing": {};');
		expect(result).not.toContain("marketing");
	});
});
