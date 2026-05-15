import { expect, test } from "vitest";

import handler from "./health";

const HTTP_OK = 200;

test("GET /api/health returns JSON with status ok", async () => {
	const request = new Request("https://localhost/api/health");
	const ctx = { request, params: {} as Record<string, never> };

	const response = await Promise.resolve(handler.GET!(ctx));

	expect(response).toBeInstanceOf(Response);
	expect(response.status).toBe(HTTP_OK);
	expect(response.headers.get("content-type")).toBe("application/json");

	const body = (await response.json()) as { status: string };
	expect(body).toEqual({ status: "ok" });
});
