import { expect, test } from "vitest";

import { page } from "./404";

test("404 page uses the default template", () => {
	expect(page.template).toBe("default");
});

test("404 page slots contain not-found content", () => {
	const slots = page.defineSlots({ loaderData: undefined });

	expect(slots.header).toBeDefined();
	expect(slots.main).toBeDefined();
});
