import { expect, test } from "vitest";

import {
	httpError,
	HttpErrorResponse,
	isHttpErrorResponse,
	isRedirectResponse,
	redirect,
	RedirectResponse,
} from "./throwable-response";

test("redirect throws RedirectResponse with 302 status and Location header", () => {
	try {
		redirect("/login");
		expect.fail("should have thrown");
	} catch (error) {
		expect(error).toBeInstanceOf(RedirectResponse);

		const redirectError = error as RedirectResponse;
		expect(redirectError.response.status).toBe(302);
		expect(redirectError.response.headers.get("location")).toBe("/login");
		expect(redirectError.message).toBe("Redirect to /login");
	}
});

test("redirect supports custom status code", () => {
	try {
		redirect("/login", 301);
		expect.fail("should have thrown");
	} catch (error) {
		expect(error).toBeInstanceOf(RedirectResponse);

		const redirectError = error as RedirectResponse;
		expect(redirectError.response.status).toBe(301);
		expect(redirectError.response.headers.get("location")).toBe("/login");
	}
});

test("httpError throws HttpErrorResponse with given status", () => {
	try {
		httpError(404);
		expect.fail("should have thrown");
	} catch (error) {
		expect(error).toBeInstanceOf(HttpErrorResponse);

		const httpErr = error as HttpErrorResponse;
		expect(httpErr.response.status).toBe(404);
		expect(httpErr.message).toBe("HTTP Error 404");
	}
});

test("httpError supports custom message in body", async () => {
	try {
		httpError(403, "Forbidden");
		expect.fail("should have thrown");
	} catch (error) {
		expect(error).toBeInstanceOf(HttpErrorResponse);

		const httpErr = error as HttpErrorResponse;
		expect(httpErr.response.status).toBe(403);
		expect(httpErr.message).toBe("Forbidden");

		const body = await httpErr.response.text();
		expect(body).toBe("Forbidden");
	}
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
