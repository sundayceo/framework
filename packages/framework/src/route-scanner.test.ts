import { describe, expect, test } from "vitest";

import { scanRoutes } from "./route-scanner";

describe("scanRoutes", () => {
	test("converts a simple static route", () => {
		const result = scanRoutes(["about.tsx"]);

		expect(result).toEqual([{ pattern: "/about", params: [], filePath: "about.tsx" }]);
	});

	test("converts index.tsx to root path", () => {
		const result = scanRoutes(["index.tsx"]);

		expect(result).toEqual([{ pattern: "/", params: [], filePath: "index.tsx" }]);
	});

	test("converts nested index route", () => {
		const result = scanRoutes(["blog/index.tsx"]);

		expect(result).toEqual([{ pattern: "/blog", params: [], filePath: "blog/index.tsx" }]);
	});

	test("converts a dynamic segment", () => {
		const result = scanRoutes(["blog/[slug].tsx"]);

		expect(result).toEqual([
			{ pattern: "/blog/:slug", params: ["slug"], filePath: "blog/[slug].tsx" },
		]);
	});

	test("converts multiple dynamic segments", () => {
		const result = scanRoutes(["products/[category]/[id].tsx"]);

		expect(result).toEqual([
			{
				pattern: "/products/:category/:id",
				params: ["category", "id"],
				filePath: "products/[category]/[id].tsx",
			},
		]);
	});

	test("ignores non-.tsx files", () => {
		const result = scanRoutes(["about.tsx", "utils.ts", "styles.css", "readme.md"]);

		expect(result).toEqual([{ pattern: "/about", params: [], filePath: "about.tsx" }]);
	});

	test("sorts static routes before dynamic routes", () => {
		const result = scanRoutes([
			"blog/[slug].tsx",
			"about.tsx",
			"blog/index.tsx",
			"products/[category]/[id].tsx",
			"index.tsx",
		]);

		const patterns = result.map((r) => r.pattern);

		expect(patterns).toEqual(["/", "/about", "/blog", "/blog/:slug", "/products/:category/:id"]);
	});

	test("returns empty array for empty input", () => {
		const result = scanRoutes([]);

		expect(result).toEqual([]);
	});

	test("returns empty array when no .tsx files are present", () => {
		const result = scanRoutes(["utils.ts", "styles.css"]);

		expect(result).toEqual([]);
	});

	test("excludes .test.tsx files", () => {
		const result = scanRoutes(["about.tsx", "about.test.tsx", "index.tsx"]);

		const patterns = result.map((r) => r.pattern);
		expect(patterns).toEqual(["/", "/about"]);
	});

	test("excludes nested .test.tsx files", () => {
		const result = scanRoutes(["api/health.tsx", "api/health.test.tsx"]);

		expect(result).toEqual([
			{ pattern: "/api/health", params: [], filePath: "api/health.tsx" },
		]);
	});
});
