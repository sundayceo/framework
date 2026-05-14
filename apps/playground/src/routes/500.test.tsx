import { expect, test } from "vitest";

import { page } from "./500";

test("500 page uses the default template", () => {
	expect(page.template).toBe("default");
});

test("500 page slots contain error content", () => {
	const slots = page.defineSlots({ loaderData: undefined });

	expect(slots.header).toBeDefined();
	expect(slots.main).toBeDefined();
});
