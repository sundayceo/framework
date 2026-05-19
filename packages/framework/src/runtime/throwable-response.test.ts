import { expect, test } from "vitest";

import {
	httpError,
	HttpErrorResponse,
	isHttpErrorResponse,
	isRedirectResponse,
	redirect,
	RedirectResponse,
} from "./throwable-response";

// --- TDD Slice 1: redirect("/login") throws RedirectResponse with 302 and Location ---

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

// --- TDD Slice 2: redirect("/login", 301) supports custom status ---

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

// --- TDD Slice 3: httpError(404) throws HttpErrorResponse with 404 status ---

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

// --- TDD Slice 4: httpError(403, "Forbidden") supports custom message ---

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

// --- TDD Slice 5: both are instanceof Error ---

test("RedirectResponse is instanceof Error", () => {
	const err = new RedirectResponse("/login");
	expect(err).toBeInstanceOf(Error);
});

test("HttpErrorResponse is instanceof Error", () => {
	const err = new HttpErrorResponse(500);
	expect(err).toBeInstanceOf(Error);
});

// --- TDD Slice 6: type guard functions ---

test("isRedirectResponse returns true for RedirectResponse", () => {
	const err = new RedirectResponse("/login");
	expect(isRedirectResponse(err)).toBe(true);
});

test("isRedirectResponse returns false for other errors", () => {
	expect(isRedirectResponse(new Error("nope"))).toBe(false);
	expect(isRedirectResponse(null)).toBe(false);
	expect(isRedirectResponse("string")).toBe(false);
});

test("isHttpErrorResponse returns true for HttpErrorResponse", () => {
	const err = new HttpErrorResponse(404);
	expect(isHttpErrorResponse(err)).toBe(true);
});

test("isHttpErrorResponse returns false for other errors", () => {
	expect(isHttpErrorResponse(new Error("nope"))).toBe(false);
	expect(isHttpErrorResponse(null)).toBe(false);
	expect(isHttpErrorResponse(undefined)).toBe(false);
});
