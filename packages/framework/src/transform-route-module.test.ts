import { describe, expect, test } from "vitest";

import { filePathToRoutePath, transformRouteModule } from "./transform-route-module";

describe("filePathToRoutePath", () => {
	test("converts index.tsx to /", () => {
		expect(filePathToRoutePath("index.tsx")).toBe("/");
	});

	test("converts simple route file", () => {
		expect(filePathToRoutePath("about.tsx")).toBe("/about");
	});

	test("converts nested route with dynamic param", () => {
		expect(filePathToRoutePath("blog/[slug].tsx")).toBe("/blog/[slug]");
	});

	test("converts nested index to parent path", () => {
		expect(filePathToRoutePath("blog/index.tsx")).toBe("/blog");
	});
});

describe("transformRouteModule", () => {
	test("fills empty definePage() with route path", () => {
		const source = `import { definePage } from "@sundayceo/framework";\nexport default definePage()({`;
		const result = transformRouteModule({ source, routePath: "/blog/[slug]" });

		expect(result).toBe(
			`import { definePage } from "@sundayceo/framework";\nexport default definePage("/blog/[slug]")({`,
		);
	});

	test("fills empty defineHandler() with route path", () => {
		const source = `import { defineHandler } from "@sundayceo/framework";\nexport const handler = defineHandler()({`;
		const result = transformRouteModule({ source, routePath: "/api/users" });

		expect(result).toBe(
			`import { defineHandler } from "@sundayceo/framework";\nexport const handler = defineHandler("/api/users")({`,
		);
	});

	test("updates existing wrong path in definePage", () => {
		const source = `export default definePage("/old-path")({`;
		const result = transformRouteModule({ source, routePath: "/new-path" });

		expect(result).toBe(`export default definePage("/new-path")({`);
	});

	test("updates existing wrong path in defineHandler", () => {
		const source = `export const handler = defineHandler("/old-path")({`;
		const result = transformRouteModule({ source, routePath: "/new-path" });

		expect(result).toBe(`export const handler = defineHandler("/new-path")({`);
	});

	test("does not modify source without definePage or defineHandler", () => {
		const source = `const x = 42;\nconsole.log(x);`;
		const result = transformRouteModule({ source, routePath: "/test" });

		expect(result).toBe(source);
	});

	test("handles root index route", () => {
		const source = `export default definePage()({`;
		const result = transformRouteModule({ source, routePath: "/" });

		expect(result).toBe(`export default definePage("/")({`);
	});

	test("does not modify already correct path", () => {
		const source = `export default definePage("/blog/[slug]")({`;
		const result = transformRouteModule({ source, routePath: "/blog/[slug]" });

		expect(result).toBe(`export default definePage("/blog/[slug]")({`);
	});

	test("fills empty defineErrorPage() with status code from route path", () => {
		const source = `import { defineErrorPage } from "@sundayceo/framework";\nexport const page = defineErrorPage()({`;
		const result = transformRouteModule({ source, routePath: "/404" });

		expect(result).toBe(
			`import { defineErrorPage } from "@sundayceo/framework";\nexport const page = defineErrorPage(404)({`,
		);
	});

	test("updates existing status code in defineErrorPage", () => {
		const source = `export const page = defineErrorPage(999)({`;
		const result = transformRouteModule({ source, routePath: "/500" });

		expect(result).toBe(`export const page = defineErrorPage(500)({`);
	});

	test("does not modify already correct defineErrorPage status", () => {
		const source = `export const page = defineErrorPage(404)({`;
		const result = transformRouteModule({ source, routePath: "/404" });

		expect(result).toBe(`export const page = defineErrorPage(404)({`);
	});
});
