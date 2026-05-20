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

	test("matches catch-all route and captures remaining segments", () => {
		const routes: TestRoute[] = [
			{ routePath: "/docs/*slug", params: ["slug"], filePath: "docs/[...slug].tsx" },
		];

		const result = matchRoute("/docs/getting-started/install", routes);

		expect(result).toEqual({
			route: routes.at(0),
			params: { slug: "getting-started/install" },
		});
	});

	test("catch-all matches single segment", () => {
		const routes: TestRoute[] = [
			{ routePath: "/docs/*slug", params: ["slug"], filePath: "docs/[...slug].tsx" },
		];

		const result = matchRoute("/docs/intro", routes);

		expect(result).toEqual({
			route: routes.at(0),
			params: { slug: "intro" },
		});
	});

	test("static route takes priority over catch-all", () => {
		const routes: TestRoute[] = [
			{ routePath: "/docs", params: [], filePath: "docs/index.tsx" },
			{ routePath: "/docs/*slug", params: ["slug"], filePath: "docs/[...slug].tsx" },
		];

		const result = matchRoute("/docs", routes);

		expect(result).toEqual({
			route: routes.at(0),
			params: {},
		});
	});

	test("catch-all does not match prefix without trailing segments", () => {
		const routes: TestRoute[] = [
			{ routePath: "/docs/*slug", params: ["slug"], filePath: "docs/[...slug].tsx" },
		];

		const result = matchRoute("/doc", routes);

		expect(result).toBeNull();
	});

	test("top-level catch-all matches any path", () => {
		const routes: TestRoute[] = [
			{ routePath: "/about", params: [], filePath: "about.tsx" },
			{ routePath: "/*path", params: ["path"], filePath: "[...path].tsx" },
		];

		const result = matchRoute("/anything/goes/here", routes);

		expect(result).toEqual({
			route: routes.at(1),
			params: { path: "anything/goes/here" },
		});
	});

	test("decodes URL-encoded characters in dynamic params", () => {
		const routes: TestRoute[] = [
			{ routePath: "/blog/:slug", params: ["slug"], filePath: "blog/[slug].tsx" },
		];

		const result = matchRoute("/blog/hello%20world", routes);

		expect(result).toEqual({
			route: routes.at(0),
			params: { slug: "hello world" },
		});
	});

	test.each([
		{
			label: "top-level catch-all at /",
			routePath: "/*path",
			paramName: "path",
			filePath: "[...path].tsx",
			url: "/",
		},
		{
			label: "prefixed catch-all at /docs",
			routePath: "/docs/*slug",
			paramName: "slug",
			filePath: "docs/[...slug].tsx",
			url: "/docs",
		},
	])(
		"catch-all captures empty string when no trailing segments ($label)",
		({ routePath, paramName, filePath, url }) => {
			const routes: TestRoute[] = [{ routePath, params: [paramName], filePath }];

			const result = matchRoute(url, routes);

			expect(result).toEqual({
				route: routes.at(0),
				params: { [paramName]: "" },
			});
		},
	);

	test("handles malformed URI components without crashing", () => {
		const routes: TestRoute[] = [
			{ routePath: "/blog/:slug", params: ["slug"], filePath: "blog/[slug].tsx" },
		];

		const result = matchRoute("/blog/%ZZ", routes);

		expect(result).toEqual({
			route: routes.at(0),
			params: { slug: "%ZZ" },
		});
	});

	test("does not match when URL has fewer segments than pattern", () => {
		const routes: TestRoute[] = [
			{ routePath: "/blog/:slug", params: ["slug"], filePath: "blog/[slug].tsx" },
		];

		const result = matchRoute("/blog", routes);

		expect(result).toBeNull();
	});

	test("does not match when extra segments exist for non-catch-all", () => {
		const routes: TestRoute[] = [
			{ routePath: "/blog/:slug", params: ["slug"], filePath: "blog/[slug].tsx" },
		];

		const result = matchRoute("/blog/hello/extra", routes);

		expect(result).toBeNull();
	});
});
