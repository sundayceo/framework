import { describe, expect, test } from "vitest";

import { generateHydrationScript } from "./generate-hydration-script";

describe("generateHydrationScript", () => {
	test("generates side-effect import of the slot module", () => {
		const script = generateHydrationScript("virtual:hydrate/demo/main");

		expect(script).toBe('import "virtual:hydrate/demo/main";');
	});

	test("uses production asset path when provided", () => {
		const script = generateHydrationScript("/assets/main-x7f3a2.js");

		expect(script).toBe('import "/assets/main-x7f3a2.js";');
	});
});
