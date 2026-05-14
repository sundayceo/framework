import { describe, expect, test } from "vitest";

import { generateHydrationScript } from "./generate-hydration-script";

describe("generateHydrationScript", () => {
	test("generates a module script importing the route component", () => {
		const script = generateHydrationScript({
			slotId: "counter",
			routePath: "/pages/home",
		});

		expect(script).toContain('import("');
		expect(script).toContain("/pages/home");
		expect(script).toContain("counter");
		expect(script).toContain("hydrateRoot");
	});

	test("targets the correct hydration boundary element", () => {
		const script = generateHydrationScript({
			slotId: "sidebar",
			routePath: "/pages/dashboard",
		});

		expect(script).toContain('[data-hydrate="sidebar"]');
	});

	test("reads loader data from the JSON script tag", () => {
		const script = generateHydrationScript({
			slotId: "main",
			routePath: "/pages/blog",
		});

		expect(script).toContain('[data-hydrate-data="main"]');
		expect(script).toContain("JSON.parse");
	});
});
