import { describe, expect, test } from "vitest";

import { matchRoute } from "./route-matcher";
import type { RouteEntry } from "./route-scanner";

const staticRoutes: RouteEntry[] = [
	{ pattern: "/", params: [], filePath: "index.tsx" },
	{ pattern: "/about", params: [], filePath: "about.tsx" },
	{ pattern: "/blog", params: [], filePath: "blog/index.tsx" },
];

describe("matchRoute", () => {
	test("matches a static route exactly", () => {
		const result = matchRoute("/about", staticRoutes);

		expect(result).toEqual({
			route: { pattern: "/about", params: [], filePath: "about.tsx" },
			params: {},
		});
	});

	test("static routes take priority over dynamic routes", () => {
		const routes: RouteEntry[] = [
			{ pattern: "/blog", params: [], filePath: "blog/index.tsx" },
			{ pattern: "/blog/:slug", params: ["slug"], filePath: "blog/[slug].tsx" },
		];

		const result = matchRoute("/blog", routes);

		expect(result).toEqual({
			route: { pattern: "/blog", params: [], filePath: "blog/index.tsx" },
			params: {},
		});
	});

	test("handles trailing slashes by normalizing", () => {
		const result = matchRoute("/about/", staticRoutes);

		expect(result).toEqual({
			route: { pattern: "/about", params: [], filePath: "about.tsx" },
			params: {},
		});
	});

	test("returns null for unmatched URLs", () => {
		const result = matchRoute("/nonexistent", staticRoutes);

		expect(result).toBeNull();
	});

	test("matches a dynamic route and extracts params", () => {
		const routes: RouteEntry[] = [
			{ pattern: "/blog", params: [], filePath: "blog/index.tsx" },
			{ pattern: "/blog/:slug", params: ["slug"], filePath: "blog/[slug].tsx" },
		];

		const result = matchRoute("/blog/hello-world", routes);

		expect(result).toEqual({
			route: { pattern: "/blog/:slug", params: ["slug"], filePath: "blog/[slug].tsx" },
			params: { slug: "hello-world" },
		});
	});

	test("matches root path /", () => {
		const result = matchRoute("/", staticRoutes);

		expect(result).toEqual({
			route: { pattern: "/", params: [], filePath: "index.tsx" },
			params: {},
		});
	});

	test("extracts multiple params from a route", () => {
		const routes: RouteEntry[] = [
			{
				pattern: "/products/:category/:id",
				params: ["category", "id"],
				filePath: "products/[category]/[id].tsx",
			},
		];

		const result = matchRoute("/products/electronics/42", routes);

		expect(result).toEqual({
			route: routes.at(0),
			params: { category: "electronics", id: "42" },
		});
	});
});
