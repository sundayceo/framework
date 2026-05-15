import { describe, expect, test, vi } from "vitest";

import { cloudflare, getCloudflareContext, type ExecutionContext } from "./cloudflare";

type TestEnv = {
	DB: string;
	CACHE: string;
};

function makeExecutionContext(): ExecutionContext {
	return {
		waitUntil: vi.fn(),
		passThroughOnException: vi.fn(),
	};
}

describe("cloudflare", () => {
	test("returns an object with a fetch method", () => {
		const handler = vi.fn();
		const worker = cloudflare(handler);

		expect(typeof worker.fetch).toBe("function");
	});

	test("fetch passes the request to the handler", async () => {
		const response = new Response("ok");
		const handler = vi.fn().mockResolvedValue(response);
		const worker = cloudflare(handler);

		const request = new Request("https://example.com/test");
		const env = {};
		const ctx = makeExecutionContext();

		const result = await worker.fetch(request, env, ctx);

		expect(handler).toHaveBeenCalledWith(request);
		expect(result).toBe(response);
	});

	test("calls the env mapping function with the Cloudflare env", async () => {
		const handler = vi.fn().mockResolvedValue(new Response("ok"));
		const envMapper = vi.fn().mockReturnValue({ db: "mapped-db" });
		const worker = cloudflare<TestEnv, { db: string }>(handler, { env: envMapper });

		const env: TestEnv = { DB: "my-db", CACHE: "my-cache" };
		const ctx = makeExecutionContext();

		await worker.fetch(new Request("https://example.com"), env, ctx);

		expect(envMapper).toHaveBeenCalledWith(env);
	});

	test("getCloudflareContext returns mapped env and ctx inside the handler", async () => {
		let capturedEnv: unknown;
		let capturedCtx: unknown;

		const handler = vi.fn().mockImplementation(() => {
			const cfContext = getCloudflareContext<{ db: string }>();
			capturedEnv = cfContext.env;
			capturedCtx = cfContext.ctx;
			return Promise.resolve(new Response("ok"));
		});

		const envMapper = (env: TestEnv): { db: string } => ({ db: env.DB });
		const worker = cloudflare<TestEnv, { db: string }>(handler, { env: envMapper });

		const env: TestEnv = { DB: "my-db", CACHE: "my-cache" };
		const ctx = makeExecutionContext();

		await worker.fetch(new Request("https://example.com"), env, ctx);

		expect(capturedEnv).toEqual({ db: "my-db" });
		expect(capturedCtx).toBe(ctx);
	});

	test("getCloudflareContext throws outside a request", () => {
		expect(() => getCloudflareContext()).toThrow(
			"getCloudflareContext() must be called inside a Cloudflare Workers request",
		);
	});

	test("works without an env mapping option", async () => {
		let capturedEnv: unknown;

		const handler = vi.fn().mockImplementation(() => {
			const cfContext = getCloudflareContext();
			capturedEnv = cfContext.env;
			return Promise.resolve(new Response("ok"));
		});

		const worker = cloudflare(handler);
		const ctx = makeExecutionContext();

		await worker.fetch(new Request("https://example.com"), { RAW: "value" }, ctx);

		expect(capturedEnv).toEqual({});
	});

	test("isolates context between concurrent requests", async () => {
		const captured: { db: string }[] = [];

		const handler = vi.fn().mockImplementation(async () => {
			const cfContext = getCloudflareContext<{ db: string }>();
			await new Promise((resolve) => setTimeout(resolve, 10));
			captured.push(cfContext.env);
			return new Response("ok");
		});

		const envMapper = (env: TestEnv): { db: string } => ({ db: env.DB });
		const worker = cloudflare<TestEnv, { db: string }>(handler, { env: envMapper });

		const ctx = makeExecutionContext();

		await Promise.all([
			worker.fetch(new Request("https://example.com/1"), { DB: "db-1", CACHE: "" }, ctx),
			worker.fetch(new Request("https://example.com/2"), { DB: "db-2", CACHE: "" }, ctx),
		]);

		expect(captured).toHaveLength(2);
		const dbs = captured.map((c) => c.db).sort();
		expect(dbs).toEqual(["db-1", "db-2"]);
	});
});
