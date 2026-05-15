import { describe, expect, test, vi } from "vitest";

import { hono, type HonoLike } from "./hono";

function createMockApp(): HonoLike & {
	registeredHandler: ((c: { req: { raw: Request } }) => Promise<Response>) | null;
} {
	const mock: HonoLike & {
		registeredHandler: ((c: { req: { raw: Request } }) => Promise<Response>) | null;
	} = {
		registeredHandler: null,
		all: vi.fn((_, handler) => {
			mock.registeredHandler = handler;
		}),
	};
	return mock;
}

describe("hono adapter", () => {
	test("registers a catch-all route with app.all('*')", () => {
		const app = createMockApp();
		const handler = vi.fn();

		hono(app, handler);

		expect(app.all).toHaveBeenCalledWith("*", expect.any(Function));
	});

	test("passes c.req.raw to the framework handler", async () => {
		const app = createMockApp();
		const expectedResponse = new Response("ok");
		const handler = vi.fn().mockResolvedValue(expectedResponse);

		hono(app, handler);

		const rawRequest = new Request("https://example.com/test");
		const context = { req: { raw: rawRequest } };

		await app.registeredHandler?.(context);

		expect(handler).toHaveBeenCalledWith(rawRequest);
	});

	test("returns the response from the framework handler", async () => {
		const app = createMockApp();
		const expectedResponse = new Response("framework response", { status: 200 });
		const handler = vi.fn().mockResolvedValue(expectedResponse);

		hono(app, handler);

		const context = { req: { raw: new Request("https://example.com") } };
		const result = await app.registeredHandler?.(context);

		expect(result).toBe(expectedResponse);
	});
});
