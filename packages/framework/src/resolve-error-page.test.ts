import { describe, expect, test } from "vitest";

import {
	defaultNotFoundPage,
	defaultServerErrorPage,
	resolveErrorPage,
} from "./resolve-error-page";

describe("defaultNotFoundPage", () => {
	test("returns HTML response with status 404", async () => {
		const response = defaultNotFoundPage();

		expect(response.status).toBe(404);
		expect(response.headers.get("content-type")).toBe("text/html;charset=utf-8");
		const body = await response.text();
		expect(body).toContain("Not Found");
		expect(body).toContain("<!DOCTYPE html>");
	});
});

describe("defaultServerErrorPage", () => {
	test("returns HTML response with status 500", async () => {
		const response = defaultServerErrorPage();

		expect(response.status).toBe(500);
		expect(response.headers.get("content-type")).toBe("text/html;charset=utf-8");
		const body = await response.text();
		expect(body).toContain("Internal Server Error");
		expect(body).toContain("<!DOCTYPE html>");
	});
});

describe("resolveErrorPage", () => {
	test("uses custom 404 page when provided in errorPages", async () => {
		const custom404 = () => new Response("Custom Not Found", { status: 404 });

		const response = resolveErrorPage({
			status: 404,
			errorPages: { 404: custom404 },
		});

		expect(response.status).toBe(404);
		expect(await response.text()).toBe("Custom Not Found");
	});

	test("uses custom 500 page when provided in errorPages", async () => {
		const custom500 = () => new Response("Custom Server Error", { status: 500 });

		const response = resolveErrorPage({
			status: 500,
			errorPages: { 500: custom500 },
		});

		expect(response.status).toBe(500);
		expect(await response.text()).toBe("Custom Server Error");
	});

	test("falls back to default 404 page when no custom page is provided", async () => {
		const response = resolveErrorPage({ status: 404 });

		expect(response.status).toBe(404);
		const body = await response.text();
		expect(body).toContain("Not Found");
		expect(body).toContain("<!DOCTYPE html>");
	});

	test("falls back to default 500 page when no custom page is provided", async () => {
		const response = resolveErrorPage({ status: 500 });

		expect(response.status).toBe(500);
		const body = await response.text();
		expect(body).toContain("Internal Server Error");
		expect(body).toContain("<!DOCTYPE html>");
	});

	test("falls back to default 500 page for unknown error status codes", async () => {
		const response = resolveErrorPage({ status: 503 });

		expect(response.status).toBe(500);
		const body = await response.text();
		expect(body).toContain("Internal Server Error");
	});
});
