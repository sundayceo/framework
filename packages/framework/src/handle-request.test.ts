import { describe, expect, test } from "vitest";

import { handleRequest } from "./handle-request";
import { HttpErrorResponse, RedirectResponse } from "./throwable-response";

describe("handleRequest", () => {
	test("returns redirect response when loader throws a RedirectResponse", async () => {
		const request = new Request("https://example.com/old-page");

		const result = await handleRequest({
			request,
			render: () => {
				throw new RedirectResponse("/new-page");
			},
		});

		expect(result.status).toBe(302);
		expect(result.headers.get("location")).toBe("/new-page");
	});

	test("returns httpError response when render throws an HttpErrorResponse", async () => {
		const request = new Request("https://example.com/not-found");

		const result = await handleRequest({
			request,
			render: () => {
				throw new HttpErrorResponse(404, "Not Found");
			},
		});

		expect(result.status).toBe(404);
		const body = await result.text();
		expect(body).toContain("Not Found");
		expect(body).toContain("<!DOCTYPE html>");
	});

	test("calls onError with error and request when an unknown error is thrown", async () => {
		const request = new Request("https://example.com/crash");
		const thrownError = new Error("unexpected");
		let capturedError: unknown;
		let capturedRequest: Request | undefined;

		await handleRequest({
			request,
			render: () => {
				throw thrownError;
			},
			onError: (error, req) => {
				capturedError = error;
				capturedRequest = req;
				return new Response("handled", { status: 503 });
			},
		});

		expect(capturedError).toBe(thrownError);
		expect(capturedRequest).toBe(request);
	});

	test("returns response from onError when provided", async () => {
		const request = new Request("https://example.com/crash");

		const result = await handleRequest({
			request,
			render: () => {
				throw new Error("unexpected");
			},
			onError: () => new Response("Custom Error Page", { status: 503 }),
		});

		expect(result.status).toBe(503);
		expect(await result.text()).toBe("Custom Error Page");
	});

	test("returns generic 500 when onError is not defined", async () => {
		const request = new Request("https://example.com/crash");

		const result = await handleRequest({
			request,
			render: () => {
				throw new Error("unexpected");
			},
		});

		expect(result.status).toBe(500);
		const body = await result.text();
		expect(body).toContain("Internal Server Error");
		expect(body).toContain("<!DOCTYPE html>");
	});

	test("returns successful response when render does not throw", async () => {
		const request = new Request("https://example.com/ok");

		const result = await handleRequest({
			request,
			render: () => new Response("OK", { status: 200 }),
		});

		expect(result.status).toBe(200);
		expect(await result.text()).toBe("OK");
	});

	test("handles async onError handler", async () => {
		const request = new Request("https://example.com/crash");

		const result = await handleRequest({
			request,
			render: () => {
				throw new Error("unexpected");
			},
			onError: async () => {
				const body = await Promise.resolve("Async Error Page");
				return new Response(body, { status: 503 });
			},
		});

		expect(result.status).toBe(503);
		expect(await result.text()).toBe("Async Error Page");
	});

	test("uses error page system when HttpErrorResponse 404 is thrown", async () => {
		const request = new Request("https://example.com/missing");

		const result = await handleRequest({
			request,
			render: () => {
				throw new HttpErrorResponse(404);
			},
		});

		expect(result.status).toBe(404);
		const body = await result.text();
		expect(body).toContain("<!DOCTYPE html>");
		expect(body).toContain("Not Found");
	});

	test("uses custom error page for 404 when errorPages is provided", async () => {
		const request = new Request("https://example.com/missing");

		const result = await handleRequest({
			request,
			render: () => {
				throw new HttpErrorResponse(404);
			},
			errorPages: {
				[404]: () => new Response("Custom 404", { status: 404 }),
			},
		});

		expect(result.status).toBe(404);
		expect(await result.text()).toBe("Custom 404");
	});

	test("uses default 500 error page when unhandled error occurs and no onError", async () => {
		const request = new Request("https://example.com/crash");

		const result = await handleRequest({
			request,
			render: () => {
				throw new Error("unexpected");
			},
		});

		expect(result.status).toBe(500);
		const body = await result.text();
		expect(body).toContain("<!DOCTYPE html>");
		expect(body).toContain("Internal Server Error");
	});

	test("uses custom 500 error page when errorPages is provided and no onError", async () => {
		const request = new Request("https://example.com/crash");

		const result = await handleRequest({
			request,
			render: () => {
				throw new Error("unexpected");
			},
			errorPages: {
				[500]: () => new Response("Custom 500", { status: 500 }),
			},
		});

		expect(result.status).toBe(500);
		expect(await result.text()).toBe("Custom 500");
	});
});
