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

	test("handles non-Error thrown values gracefully", async () => {
		const res = await handleError({
			error: "string error",
			request: MOCK_REQUEST,
			onError: undefined,
			errorPages: undefined,
			templates: {},
			appContext: EMPTY_CONTEXT,
		});

		expect(res.status).toBe(500);
	});

	test("handles null thrown value gracefully", async () => {
		const res = await handleError({
			error: null,
			request: MOCK_REQUEST,
			onError: undefined,
			errorPages: undefined,
			templates: {},
			appContext: EMPTY_CONTEXT,
		});

		expect(res.status).toBe(500);
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
