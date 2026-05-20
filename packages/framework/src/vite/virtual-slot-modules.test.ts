import { describe, expect, test } from "vitest";

import { isHydrateModuleId, loadVirtualSlotModule, resolveHydrateId } from "./virtual-slot-modules";

describe("isHydrateModuleId", () => {
	test("returns true for virtual:hydrate module IDs", () => {
		expect(isHydrateModuleId("virtual:hydrate/demo/main")).toBe(true);
	});

	test("returns true for .jsx suffixed hydrate IDs", () => {
		expect(isHydrateModuleId("virtual:hydrate/demo/main.jsx")).toBe(true);
	});

	test("returns false for non-hydrate virtual modules", () => {
		expect(isHydrateModuleId("virtual:other-thing")).toBe(false);
	});

	test("returns false for regular module paths", () => {
		expect(isHydrateModuleId("./components/Counter")).toBe(false);
	});
});

describe("resolveHydrateId", () => {
	test("resolves hydrate ID to null-byte prefixed .jsx path", () => {
		expect(resolveHydrateId("virtual:hydrate/demo/main")).toBe("\0virtual:hydrate/demo/main.jsx");
	});

	test("handles .jsx suffixed input", () => {
		expect(resolveHydrateId("virtual:hydrate/demo/main.jsx")).toBe(
			"\0virtual:hydrate/demo/main.jsx",
		);
	});

	test("returns undefined for non-hydrate IDs", () => {
		expect(resolveHydrateId("virtual:other")).toBeUndefined();
	});

	test("returns undefined for regular module paths", () => {
		expect(resolveHydrateId("./components/Counter")).toBeUndefined();
	});
});

describe("loadVirtualSlotModule", () => {
	test("returns extracted module source for matching route+slot", () => {
		const routeSources = new Map<string, string>([
			[
				"/demo",
				`
import React from "react";
import { definePage } from "@sundayceo/framework";
import Counter from "../components/Counter";

export default definePage("/demo")({
  template: "default",
  loader: () => ({ count: 0 }),
  defineSlots: ({ loaderData }) => ({
    header: <h1>Static</h1>,
    main: <Counter initial={loaderData.count} />,
  }),
});
`,
			],
		]);

		const result = loadVirtualSlotModule({ id: "virtual:hydrate/demo/main", routeSources });

		expect(result).not.toBeNull();
		expect(result).toContain("Counter");
		expect(result).toContain("{ loaderData }");
	});

	test("returns null for unknown virtual module id", () => {
		const routeSources = new Map<string, string>();

		const result = loadVirtualSlotModule({ id: "virtual:hydrate/unknown/slot", routeSources });

		expect(result).toBeNull();
	});

	test("returns null for non-hydrate virtual module", () => {
		const routeSources = new Map<string, string>();

		const result = loadVirtualSlotModule({ id: "virtual:other-thing", routeSources });

		expect(result).toBeNull();
	});

	test("rewrites relative imports to absolute paths when routesDir is provided", () => {
		const routeSources = new Map<string, string>([
			[
				"/demo",
				`
import React from "react";
import { definePage } from "@sundayceo/framework";
import Counter from "../components/Counter";

export default definePage("/demo")({
  template: "default",
  loader: () => ({ count: 0 }),
  defineSlots: ({ loaderData }) => ({
    main: <Counter initial={loaderData.count} />,
  }),
});
`,
			],
		]);

		const result = loadVirtualSlotModule({
			id: "virtual:hydrate/demo/main",
			routeSources,
			routesDir: "/app/src/routes",
		});

		expect(result).not.toBeNull();
		expect(result).toContain("Counter");
		expect(result).not.toContain('"../components/Counter"');
		expect(result).toContain("/app/src/components/Counter");
	});

	test("uses filePathMap when rewriting imports for route groups", () => {
		const routeSources = new Map<string, string>([
			[
				"/pricing",
				`
import React from "react";
import { definePage } from "@sundayceo/framework";
import Badge from "../../components/Badge";

export default definePage("/pricing")({
  template: "default",
  defineSlots: () => ({
    main: <Badge text="pro" />,
  }),
});
`,
			],
		]);

		const result = loadVirtualSlotModule({
			id: "virtual:hydrate/pricing/main",
			routeSources,
			routesDir: "/app/src/routes",
			filePathMap: { "/pricing": "(marketing)/pricing.tsx" },
		});

		expect(result).not.toBeNull();
		expect(result).toContain("Badge");
		expect(result).toContain("/app/src/components/Badge");
	});

	test("static slot has no loaderData param", () => {
		const routeSources = new Map<string, string>([
			[
				"/about",
				`
import React from "react";
import { definePage } from "@sundayceo/framework";

export default definePage("/about")({
  template: "default",
  defineSlots: () => ({
    content: <p>Static</p>,
  }),
});
`,
			],
		]);

		const result = loadVirtualSlotModule({ id: "virtual:hydrate/about/content", routeSources });

		expect(result).not.toBeNull();
		expect(result).toContain("HydrateSlot()");
		expect(result).not.toContain("loaderData");
	});
});
