import { describe, expect, test } from "vitest";

import { scanRoutes } from "./route-scanner";

describe("scanRoutes", () => {
	test.each([
		["simple static route", ["about.tsx"], [{ routePath: "/about", params: [], filePath: "about.tsx" }]],
		["index.tsx to root path", ["index.tsx"], [{ routePath: "/", params: [], filePath: "index.tsx" }]],
		["nested index route", ["blog/index.tsx"], [{ routePath: "/blog", params: [], filePath: "blog/index.tsx" }]],
		[
			"dynamic segment",
			["blog/[slug].tsx"],
			[{ routePath: "/blog/:slug", params: ["slug"], filePath: "blog/[slug].tsx" }],
		],
		[
			"multiple dynamic segments",
			["products/[category]/[id].tsx"],
			[{ routePath: "/products/:category/:id", params: ["category", "id"], filePath: "products/[category]/[id].tsx" }],
		],
		[
			"catch-all route [...slug]",
			["docs/[...slug].tsx"],
			[{ routePath: "/docs/*slug", params: ["slug"], filePath: "docs/[...slug].tsx" }],
		],
		[
			"top-level catch-all route",
			["[...path].tsx"],
			[{ routePath: "/*path", params: ["path"], filePath: "[...path].tsx" }],
		],
	])("converts %s", (_label, input, expected) => {
		const result = scanRoutes(input);
		expect(result.routes).toEqual(expected);
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

	test("excludes error page test files", () => {
		const result = scanRoutes(["404.tsx", "404.test.tsx"]);

		expect(result.errorPages).toEqual([{ status: 404, filePath: "404.tsx" }]);
	});

	test("sorts catch-all routes after dynamic routes", () => {
		const result = scanRoutes(["docs/[...slug].tsx", "blog/[slug].tsx", "about.tsx", "index.tsx"]);

		const patterns = result.routes.map((r) => r.routePath);

		expect(patterns).toEqual(["/", "/about", "/blog/:slug", "/docs/*slug"]);
	});

	test("strips route group folders from URL pattern", () => {
		const result = scanRoutes(["(marketing)/about.tsx", "(marketing)/pricing.tsx"]);

		expect(result.routes).toEqual([
			{ routePath: "/about", params: [], filePath: "(marketing)/about.tsx" },
			{ routePath: "/pricing", params: [], filePath: "(marketing)/pricing.tsx" },
		]);
	});

	test("route groups with nested paths", () => {
		const result = scanRoutes(["(auth)/login.tsx", "(auth)/register.tsx", "(app)/dashboard.tsx"]);

		const patterns = result.routes.map((r) => r.routePath);
		expect(patterns).toEqual(["/dashboard", "/login", "/register"]);
	});

	test("route groups with dynamic params", () => {
		const result = scanRoutes(["(app)/users/[id].tsx"]);

		expect(result.routes).toEqual([
			{ routePath: "/users/:id", params: ["id"], filePath: "(app)/users/[id].tsx" },
		]);
	});
});
