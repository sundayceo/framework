import { describe, expect, test, vi } from "vitest";

import { handleError, renderErrorPage } from "./handle-error";
import { HttpErrorResponse, RedirectResponse } from "./throwable-response";

const MOCK_REQUEST = new Request("http://localhost/test");
const EMPTY_CONTEXT = {};

describe("renderErrorPage", () => {
	test("returns bare 404 page when no error pages defined", async () => {
		const res = await renderErrorPage({
			status: 404,
			errorPages: undefined,
			templates: {},
			request: MOCK_REQUEST,
			appContext: EMPTY_CONTEXT,
		});

		expect(res.status).toBe(404);
		const body = await res.text();
		expect(body).toContain("Not Found");
	});

	test("returns bare 500 page when no error pages defined", async () => {
		const res = await renderErrorPage({
			status: 500,
			errorPages: undefined,
			templates: {},
			request: MOCK_REQUEST,
			appContext: EMPTY_CONTEXT,
		});

		expect(res.status).toBe(500);
		const body = await res.text();
		expect(body).toContain("Internal Server Error");
	});

	test("returns bare page when error page module is invalid", async () => {
		const res = await renderErrorPage({
			status: 404,
			errorPages: {
				[404]: () => Promise.resolve({ default: "not-a-module" }),
			},
			templates: {},
			request: MOCK_REQUEST,
			appContext: EMPTY_CONTEXT,
		});

		expect(res.status).toBe(404);
	});

	test("returns bare page when template is missing", async () => {
		const res = await renderErrorPage({
			status: 404,
			errorPages: {
				[404]: () =>
					Promise.resolve({
						default: {
							template: "nonexistent",
							defineSlots: () => ({}),
						},
					}),
			},
			templates: {},
			request: MOCK_REQUEST,
			appContext: EMPTY_CONTEXT,
		});

		expect(res.status).toBe(404);
	});

	test("logs error when error page rendering fails", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());
		const renderError = new Error("template exploded");

		const res = await renderErrorPage({
			status: 500,
			errorPages: {
				[500]: () => Promise.reject(renderError),
			},
			templates: {},
			request: MOCK_REQUEST,
			appContext: EMPTY_CONTEXT,
		});

		expect(res.status).toBe(500);
		expect(consoleSpy).toHaveBeenCalledWith(
			"Failed to render error page for status 500:",
			renderError,
		);
		consoleSpy.mockRestore();
	});
});

describe("handleError", () => {
	test("returns redirect response for RedirectResponse errors", async () => {
		const error = new RedirectResponse("/login");

		const res = await handleError({
			error,
			request: MOCK_REQUEST,
			onError: undefined,
			errorPages: undefined,
			templates: {},
			appContext: EMPTY_CONTEXT,
		});

		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toBe("/login");
	});

	test("returns status from HttpErrorResponse", async () => {
		const error = new HttpErrorResponse(403);

		const res = await handleError({
			error,
			request: MOCK_REQUEST,
			onError: undefined,
			errorPages: undefined,
			templates: {},
			appContext: EMPTY_CONTEXT,
		});

		expect(res.status).toBe(403);
	});

	test("returns 500 for generic errors", async () => {
		const error = new Error("something broke");

		const res = await handleError({
			error,
			request: MOCK_REQUEST,
			onError: undefined,
			errorPages: undefined,
			templates: {},
			appContext: EMPTY_CONTEXT,
		});

		expect(res.status).toBe(500);
	});

	test("calls onError hook for non-redirect errors", async () => {
		const onError = vi.fn();
		const error = new Error("broken");

		await handleError({
			error,
			request: MOCK_REQUEST,
			onError,
			errorPages: undefined,
			templates: {},
			appContext: EMPTY_CONTEXT,
		});

		expect(onError).toHaveBeenCalledWith(error, MOCK_REQUEST);
	});

	test("does not call onError for redirect errors", async () => {
		const onError = vi.fn();
		const error = new RedirectResponse("/");

		await handleError({
			error,
			request: MOCK_REQUEST,
			onError,
			errorPages: undefined,
			templates: {},
			appContext: EMPTY_CONTEXT,
		});

		expect(onError).not.toHaveBeenCalled();
	});

	test.each([
		{ label: "string", error: "string error" },
		{ label: "null", error: null },
	])("handles non-Error thrown values gracefully ($label)", async ({ error }) => {
		const res = await handleError({
			error,
			request: MOCK_REQUEST,
			onError: undefined,
			errorPages: undefined,
			templates: {},
			appContext: EMPTY_CONTEXT,
		});

		expect(res.status).toBe(500);
	});

	test("uses default message for unknown status codes", async () => {
		const error = new HttpErrorResponse(418);

		const res = await handleError({
			error,
			request: MOCK_REQUEST,
			onError: undefined,
			errorPages: undefined,
			templates: {},
			appContext: EMPTY_CONTEXT,
		});

		expect(res.status).toBe(418);
	});

	test("survives onError hook that throws", async () => {
		const onError = vi.fn(() => {
			throw new Error("hook crashed");
		});

		const res = await handleError({
			error: new Error("original"),
			request: MOCK_REQUEST,
			onError,
			errorPages: undefined,
			templates: {},
			appContext: EMPTY_CONTEXT,
		});

		expect(res.status).toBe(500);
	});
});
