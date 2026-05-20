import { expect, test } from "vitest";

import { isRedirectResponse } from "@sundayceo/framework";

import handler from "./redirect-test";

test("redirect-test handler throws RedirectResponse", () => {
	const request = new Request("https://localhost/redirect-test");
	const ctx = { request, params: {} as Record<string, never> };

	try {
		handler.GET!(ctx);
		expect.unreachable("should have thrown");
	} catch (error) {
		expect(isRedirectResponse(error)).toBe(true);
	}
});
