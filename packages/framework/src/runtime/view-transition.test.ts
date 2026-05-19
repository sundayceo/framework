import { describe, expect, test } from "vitest";

import { viewTransitionName } from "./view-transition";

describe("viewTransitionName", () => {
	test("returns style object with viewTransitionName", () => {
		const result = viewTransitionName("hero");

		expect(result).toEqual({ style: { viewTransitionName: "hero" } });
	});
});
