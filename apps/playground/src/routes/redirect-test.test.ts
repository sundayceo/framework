import { expect, test } from "vitest";

import { handleRequest, RedirectResponse } from "@sundayceo/framework";

import handler from "./redirect-test";

const REDIRECT_STATUS = 302;

test("redirect-test handler throws RedirectResponse", () => {
	const request = new Request("https://localhost/redirect-test");
	const ctx = { request, params: {} as Record<string, never> };

	expect(() => handler.GET!(ctx)).toThrow(RedirectResponse);
});

test("redirect-test works through handleRequest", async () => {
	const request = new Request("https://localhost/redirect-test");

	const response = await handleRequest({
		request,
		render: () => {
			const ctx = { request, params: {} as Record<string, never> };
			const result = handler.GET!(ctx);
			if (result instanceof Promise) {
				throw new Error("Expected synchronous response");
			}
			return result;
		},
	});

	expect(response.status).toBe(REDIRECT_STATUS);
	expect(response.headers.get("location")).toBe("/");
});
