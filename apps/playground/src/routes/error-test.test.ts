import { expect, test } from "vitest";

import { handleRequest, HttpErrorResponse } from "@sundayceo/framework";

import handler from "./error-test";

const NOT_FOUND = 404;

test("error-test handler throws HttpErrorResponse with 404", () => {
	const request = new Request("https://localhost/error-test");
	const ctx = { request, params: {} as Record<string, never> };

	expect(() => handler.GET!(ctx)).toThrow(HttpErrorResponse);
});

test("error-test triggers 404 error page through handleRequest", async () => {
	const request = new Request("https://localhost/error-test");

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

	expect(response.status).toBe(NOT_FOUND);
});

test("error-test uses custom 404 error page when provided", async () => {
	const request = new Request("https://localhost/error-test");

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
		errorPages: {
			[NOT_FOUND]: () => new Response("Custom Not Found", { status: NOT_FOUND }),
		},
	});

	expect(response.status).toBe(NOT_FOUND);
	expect(await response.text()).toBe("Custom Not Found");
});
