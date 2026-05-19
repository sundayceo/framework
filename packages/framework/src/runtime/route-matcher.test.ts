import { describe, expect, test } from "vitest";

import { matchRoute } from "./route-matcher";
import type { MatchableRoute } from "./types";

type TestRoute = MatchableRoute & { filePath: string };

const staticRoutes: TestRoute[] = [
	{ routePath: "/", params: [], filePath: "index.tsx" },
	{ routePath: "/about", params: [], filePath: "about.tsx" },
	{ routePath: "/blog", params: [], filePath: "blog/index.tsx" },
];

describe("matchRoute", () => {
	test("matches a static route exactly", () => {
		const result = matchRoute("/about", staticRoutes);

		expect(result).toEqual({
			route: { routePath: "/about", params: [], filePath: "about.tsx" },
			params: {},
		});
	});

	test("static routes take priority over dynamic routes", () => {
		const routes: TestRoute[] = [
			{ routePath: "/blog", params: [], filePath: "blog/index.tsx" },
			{ routePath: "/blog/:slug", params: ["slug"], filePath: "blog/[slug].tsx" },
		];

		const result = matchRoute("/blog", routes);

		expect(result).toEqual({
			route: { routePath: "/blog", params: [], filePath: "blog/index.tsx" },
			params: {},
		});
	});

	test("handles trailing slashes by normalizing", () => {
		const result = matchRoute("/about/", staticRoutes);

		expect(result).toEqual({
			route: { routePath: "/about", params: [], filePath: "about.tsx" },
			params: {},
		});
	});

	test("returns null for unmatched URLs", () => {
		const result = matchRoute("/nonexistent", staticRoutes);

		expect(result).toBeNull();
	});

	test("matches a dynamic route and extracts params", () => {
		const routes: TestRoute[] = [
			{ routePath: "/blog", params: [], filePath: "blog/index.tsx" },
			{ routePath: "/blog/:slug", params: ["slug"], filePath: "blog/[slug].tsx" },
		];

		const result = matchRoute("/blog/hello-world", routes);

		expect(result).toEqual({
			route: { routePath: "/blog/:slug", params: ["slug"], filePath: "blog/[slug].tsx" },
			params: { slug: "hello-world" },
		});
	});

	test("matches root path /", () => {
		const result = matchRoute("/", staticRoutes);

		expect(result).toEqual({
			route: { routePath: "/", params: [], filePath: "index.tsx" },
			params: {},
		});
	});

	test("extracts multiple params from a route", () => {
		const routes: TestRoute[] = [
			{
				routePath: "/products/:category/:id",
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
