import { describe, expect, test } from "vitest";

import { createHandler, type HandlerConfig } from "@sundayceo/framework";

import { app } from "../app";
import { errorPages, routes, templates } from "../routes.gen";

const handler = createHandler({
	app,
	routes,
	templates,
	errorPages,
} as unknown as HandlerConfig);

async function fetchDemo(): Promise<Response> {
	return handler.fetch(new Request("http://localhost/demo"));
}

describe("demo page structure", () => {
	test("returns 200 for /demo", async () => {
		const response = await fetchDemo();
		expect(response.status).toBe(200);
	});

	test("returns HTML content type", async () => {
		const response = await fetchDemo();
		expect(response.headers.get("content-type")).toContain("text/html");
	});
});

describe("demo page SSR rendering", () => {
	test("renders all slots with loader data", async () => {
		const response = await fetchDemo();
		const html = await response.text();

		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("<h1>Demo Page</h1>");
		expect(html).toContain("Count:");
		expect(html).toContain("Static footer content");
	});

	test("renders interactive component with initial state", async () => {
		const response = await fetchDemo();
		const html = await response.text();

		expect(html).toContain("<button>");
		expect(html).toContain("Count:");
	});
});
