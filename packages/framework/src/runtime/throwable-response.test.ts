import { expect, test } from "vitest";

import {
	httpError,
	HttpErrorResponse,
	isHttpErrorResponse,
	isRedirectResponse,
	redirect,
	RedirectResponse,
} from "./throwable-response";

test("redirect returns RedirectResponse with 302 status and Location header", () => {
	const error = redirect("/login");

	expect(error).toBeInstanceOf(RedirectResponse);
	expect(error.response.status).toBe(302);
	expect(error.response.headers.get("location")).toBe("/login");
	expect(error.message).toBe("Redirect to /login");
});

test("redirect supports custom status code", () => {
	const error = redirect("/login", 301);

	expect(error).toBeInstanceOf(RedirectResponse);
	expect(error.response.status).toBe(301);
	expect(error.response.headers.get("location")).toBe("/login");
});

test("httpError returns HttpErrorResponse with given status", () => {
	const error = httpError(404);

	expect(error).toBeInstanceOf(HttpErrorResponse);
	expect(error.response.status).toBe(404);
	expect(error.message).toBe("HTTP Error 404");
});

test("httpError supports custom message in body", async () => {
	const error = httpError(403, "Forbidden");

	expect(error).toBeInstanceOf(HttpErrorResponse);
	expect(error.response.status).toBe(403);
	expect(error.message).toBe("Forbidden");

	const body = await error.response.text();
	expect(body).toBe("Forbidden");
});

test.each([
	{ label: "RedirectResponse instance", value: new RedirectResponse("/login"), expected: true },
	{ label: "plain Error", value: new Error("nope"), expected: false },
	{ label: "null", value: null, expected: false },
	{ label: "string", value: "string", expected: false },
] as const)("isRedirectResponse returns $expected for $label", ({ value, expected }) => {
	expect(isRedirectResponse(value)).toBe(expected);
});

test.each([
	{ label: "HttpErrorResponse instance", value: new HttpErrorResponse(404), expected: true },
	{ label: "plain Error", value: new Error("nope"), expected: false },
	{ label: "null", value: null, expected: false },
	{ label: "undefined", value: undefined, expected: false },
] as const)("isHttpErrorResponse returns $expected for $label", ({ value, expected }) => {
	expect(isHttpErrorResponse(value)).toBe(expected);
});
