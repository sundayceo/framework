import { describe, expect, test } from "vitest";

import { loadVirtualSlotModule } from "./virtual-slot-modules";

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

		const result = loadVirtualSlotModule("virtual:hydrate/demo/main", routeSources);

		expect(result).not.toBeNull();
		expect(result).toContain("Counter");
		expect(result).toContain("{ loaderData }");
	});

	test("returns null for unknown virtual module id", () => {
		const routeSources = new Map<string, string>();

		const result = loadVirtualSlotModule("virtual:hydrate/unknown/slot", routeSources);

		expect(result).toBeNull();
	});

	test("returns null for non-hydrate virtual module", () => {
		const routeSources = new Map<string, string>();

		const result = loadVirtualSlotModule("virtual:other-thing", routeSources);

		expect(result).toBeNull();
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

		const result = loadVirtualSlotModule("virtual:hydrate/about/content", routeSources);

		expect(result).not.toBeNull();
		expect(result).toContain("HydrateSlot()");
		expect(result).not.toContain("loaderData");
	});
});
