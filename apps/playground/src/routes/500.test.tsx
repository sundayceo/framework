import { expect, test } from "vitest";

import { page } from "./500";

test("500 page uses the default template", () => {
	expect(page.template).toBe("default");
});

test("500 page loader extracts message and stack from error context", () => {
	const errorCtx = {
		error: {
			status: 500,
			message: "Internal Server Error",
			stack: "Error: Internal Server Error\n    at foo.ts:1",
		},
	};

	const data = page.loader(errorCtx);

	expect(data).toEqual({
		message: "Internal Server Error",
		stack: "Error: Internal Server Error\n    at foo.ts:1",
	});
});

test("500 page slots render with loader data", () => {
	const slots = page.defineSlots({
		loaderData: { message: "boom", stack: undefined },
	});

	expect(slots.header).toBeDefined();
	expect(slots.main).toBeDefined();
});
