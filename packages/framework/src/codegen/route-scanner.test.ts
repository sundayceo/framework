import { describe, expect, test } from "vitest";

import { scanRoutes } from "./route-scanner";

describe("scanRoutes", () => {
	test("converts a simple static route", () => {
		const result = scanRoutes(["about.tsx"]);

		expect(result.routes).toEqual([{ routePath: "/about", params: [], filePath: "about.tsx" }]);
	});

	test("converts index.tsx to root path", () => {
		const result = scanRoutes(["index.tsx"]);

		expect(result.routes).toEqual([{ routePath: "/", params: [], filePath: "index.tsx" }]);
	});

	test("converts nested index route", () => {
		const result = scanRoutes(["blog/index.tsx"]);

		expect(result.routes).toEqual([{ routePath: "/blog", params: [], filePath: "blog/index.tsx" }]);
	});

	test("converts a dynamic segment", () => {
		const result = scanRoutes(["blog/[slug].tsx"]);

		expect(result.routes).toEqual([
			{ routePath: "/blog/:slug", params: ["slug"], filePath: "blog/[slug].tsx" },
		]);
	});

	test("converts multiple dynamic segments", () => {
		const result = scanRoutes(["products/[category]/[id].tsx"]);

		expect(result.routes).toEqual([
			{
				routePath: "/products/:category/:id",
				params: ["category", "id"],
				filePath: "products/[category]/[id].tsx",
			},
		]);
	});

	test("accepts both .tsx and .ts files", () => {
		const result = scanRoutes(["about.tsx", "api/health.ts"]);

		expect(result.routes).toEqual([
			{ routePath: "/about", params: [], filePath: "about.tsx" },
			{ routePath: "/api/health", params: [], filePath: "api/health.ts" },
		]);
	});

	test("ignores non-route files", () => {
		const result = scanRoutes(["about.tsx", "styles.css", "readme.md"]);

		expect(result.routes).toEqual([{ routePath: "/about", params: [], filePath: "about.tsx" }]);
	});

	test("sorts static routes before dynamic routes", () => {
		const result = scanRoutes([
			"blog/[slug].tsx",
			"about.tsx",
			"blog/index.tsx",
			"products/[category]/[id].tsx",
			"index.tsx",
		]);

		const patterns = result.routes.map((r) => r.routePath);

		expect(patterns).toEqual(["/", "/about", "/blog", "/blog/:slug", "/products/:category/:id"]);
	});

	test("returns empty arrays for empty input", () => {
		const result = scanRoutes([]);

		expect(result.routes).toEqual([]);
		expect(result.errorPages).toEqual([]);
	});

	test("returns empty arrays when no route files are present", () => {
		const result = scanRoutes(["styles.css", "readme.md"]);

		expect(result.routes).toEqual([]);
		expect(result.errorPages).toEqual([]);
	});

	test("excludes .test.tsx files", () => {
		const result = scanRoutes(["about.tsx", "about.test.tsx", "index.tsx"]);

		const patterns = result.routes.map((r) => r.routePath);
		expect(patterns).toEqual(["/", "/about"]);
	});

	test("excludes nested .test.tsx files", () => {
		const result = scanRoutes(["api/health.tsx", "api/health.test.tsx"]);

		expect(result.routes).toEqual([
			{ routePath: "/api/health", params: [], filePath: "api/health.tsx" },
		]);
	});

	test("separates 404.tsx into errorPages", () => {
		const result = scanRoutes(["index.tsx", "404.tsx"]);

		expect(result.routes).toEqual([{ routePath: "/", params: [], filePath: "index.tsx" }]);
		expect(result.errorPages).toEqual([{ status: 404, filePath: "404.tsx" }]);
	});

	test("separates multiple error pages (404, 500)", () => {
		const result = scanRoutes(["index.tsx", "404.tsx", "500.tsx"]);

		expect(result.routes).toEqual([{ routePath: "/", params: [], filePath: "index.tsx" }]);
		expect(result.errorPages).toEqual([
			{ status: 404, filePath: "404.tsx" },
			{ status: 500, filePath: "500.tsx" },
		]);
	});

	test("keeps non-error numeric files as regular routes", () => {
		const result = scanRoutes(["200.tsx", "42.tsx", "301.tsx"]);

		expect(result.routes).toEqual([
			{ routePath: "/200", params: [], filePath: "200.tsx" },
			{ routePath: "/301", params: [], filePath: "301.tsx" },
			{ routePath: "/42", params: [], filePath: "42.tsx" },
		]);
		expect(result.errorPages).toEqual([]);
	});
});
