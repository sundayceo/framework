import { expect, test } from "vitest";

import { viewTransitionName } from "./view-transition";

test("returns a style prop with the given view-transition-name", () => {
	expect(viewTransitionName("hero")).toEqual({ style: { viewTransitionName: "hero" } });
});
