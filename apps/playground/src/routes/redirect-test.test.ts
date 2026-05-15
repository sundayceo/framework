import { expect, test } from "vitest";

import { RedirectResponse } from "@sundayceo/framework";

import { handler } from "./redirect-test";

test("redirect-test handler throws RedirectResponse", () => {
	const request = new Request("https://localhost/redirect-test");
	const ctx = { request, params: {} as Record<string, never> };

	expect(() => handler.GET!(ctx)).toThrow(RedirectResponse);
});
