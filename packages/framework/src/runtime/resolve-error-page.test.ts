import { describe, expect, test } from "vitest";

import {
	defaultNotFoundPage,
	defaultServerErrorPage,
	resolveErrorPage,
} from "./resolve-error-page";

describe.each([
	{ name: "defaultNotFoundPage", fn: defaultNotFoundPage, status: 404, bodySnippet: "Not Found" },
	{
		name: "defaultServerErrorPage",
		fn: defaultServerErrorPage,
		status: 500,
		bodySnippet: "Internal Server Error",
	},
])("$name", ({ fn, status, bodySnippet }) => {
	test(`returns HTML response with status ${status}`, async () => {
		const response = fn();

		expect(response.status).toBe(status);
		expect(response.headers.get("content-type")).toBe("text/html;charset=utf-8");
		const body = await response.text();
		expect(body).toContain(bodySnippet);
		expect(body).toContain("<!DOCTYPE html>");
	});
});

describe("resolveErrorPage", () => {
	test.each([
		{
			label: "custom 404 page",
			status: 404,
			factory: (): Response => new Response("Custom Not Found", { status: 404 }),
			expectedBody: "Custom Not Found",
		},
		{
			label: "custom 500 page",
			status: 500,
			factory: (): Response => new Response("Custom Server Error", { status: 500 }),
			expectedBody: "Custom Server Error",
		},
	])(
		"uses $label when provided in errorPages",
		async ({ status, factory, expectedBody }) => {
			const response = resolveErrorPage({
				status,
				errorPages: { [status]: factory },
			});

			expect(response.status).toBe(status);
			expect(await response.text()).toBe(expectedBody);
		},
	);

	test.each([
		{ status: 404, bodySnippet: "Not Found" },
		{ status: 500, bodySnippet: "Internal Server Error" },
	])(
		"falls back to default $status page when no custom page is provided",
		async ({ status, bodySnippet }) => {
			const response = resolveErrorPage({ status });

			expect(response.status).toBe(status);
			const body = await response.text();
			expect(body).toContain(bodySnippet);
			expect(body).toContain("<!DOCTYPE html>");
		},
	);

	test("preserves original status code for unknown error codes", async () => {
		const response = resolveErrorPage({ status: 503 });

		expect(response.status).toBe(503);
		const body = await response.text();
		expect(body).toContain("Internal Server Error");
	});
});
