import { expect, test } from "vitest";

import { HttpErrorResponse } from "@sundayceo/framework";

import handler from "./error-test";

test("error-test handler throws HttpErrorResponse with 404", () => {
	const request = new Request("https://localhost/error-test");
	const ctx = { request, params: {} as Record<string, never> };

	expect(() => handler.GET!(ctx)).toThrow(HttpErrorResponse);
});
