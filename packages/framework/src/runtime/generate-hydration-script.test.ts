import { describe, expect, test } from "vitest";

import { generateHydrationScript } from "./generate-hydration-script";

describe("generateHydrationScript", () => {
	test("imports the slot virtual module directly", () => {
		const script = generateHydrationScript({
			slotId: "main",
			assetPath: "virtual:hydrate/demo/main",
		});

		expect(script).toContain('from "virtual:hydrate/demo/main"');
		expect(script).toContain("HydrateSlot");
		expect(script).not.toContain("defineSlots");
	});

	test("targets the correct hydration boundary element", () => {
		const script = generateHydrationScript({
			slotId: "sidebar",
			assetPath: "/assets/sidebar-abc123.js",
		});

		expect(script).toContain('[data-hydrate="sidebar"]');
	});

	test("reads loader data from the JSON script tag", () => {
		const script = generateHydrationScript({
			slotId: "main",
			assetPath: "virtual:hydrate/blog/main",
		});

		expect(script).toContain('[data-hydrate-data="main"]');
		expect(script).toContain("JSON.parse");
	});

	test("passes loaderData to HydrateSlot", () => {
		const script = generateHydrationScript({
			slotId: "counter",
			assetPath: "virtual:hydrate/demo/counter",
		});

		expect(script).toContain("HydrateSlot({ loaderData");
		expect(script).toContain("hydrateRoot");
	});

	test("uses production asset path when provided", () => {
		const script = generateHydrationScript({
			slotId: "main",
			assetPath: "/assets/main-x7f3a2.js",
		});

		expect(script).toContain('from "/assets/main-x7f3a2.js"');
	});
});
