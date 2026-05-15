import { describe, expect, test, vi } from "vitest";

import { cloudflare, type ExecutionContext } from "./cloudflare";
import { createRequestHandler, type RequestHandlerOptions } from "./create-request-handler";
import type { MatchableRoute } from "./route-scanner";

vi.mock("./create-request-handler", () => ({
	createRequestHandler: vi.fn(),
}));

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

function makeHandlerOptions(): RequestHandlerOptions {
	return {
		app: {
			context: vi.fn().mockResolvedValue({ existing: "value" }),
			onError: vi.fn(),
		},
		getRoutes: () => [],
		loadRouteModule: vi.fn(),
		loadTemplate: vi.fn(),
	};
}

describe("cloudflare", () => {
	test("returns an object with a fetch method", () => {
		const worker = cloudflare(makeHandlerOptions());

		expect(typeof worker.fetch).toBe("function");
	});

	test("passes the request through to the handler", async () => {
		const response = new Response("ok");
		const mockHandler = vi.fn().mockResolvedValue(response);
		vi.mocked(createRequestHandler).mockReturnValue(mockHandler);

		const worker = cloudflare(makeHandlerOptions());
		const request = new Request("https://example.com/test");
		const ctx = makeExecutionContext();

		const result = await worker.fetch(request, {}, ctx);

		expect(mockHandler).toHaveBeenCalledWith(request);
		expect(result).toBe(response);
	});

	test("calls the env mapping function with the Cloudflare env", async () => {
		const mockHandler = vi.fn().mockResolvedValue(new Response("ok"));
		vi.mocked(createRequestHandler).mockReturnValue(mockHandler);

		const envMapper = vi.fn().mockReturnValue({ db: "mapped-db" });
		const worker = cloudflare<MatchableRoute, TestEnv, { db: string }>(makeHandlerOptions(), {
			env: envMapper,
		});

		const env: TestEnv = { DB: "my-db", CACHE: "my-cache" };
		const ctx = makeExecutionContext();

		await worker.fetch(new Request("https://example.com"), env, ctx);

		expect(envMapper).toHaveBeenCalledWith(env);
	});

	test("env-mapped values are merged into the app context", async () => {
		const mockHandler = vi.fn().mockResolvedValue(new Response("ok"));
		let capturedOptions: RequestHandlerOptions | undefined;
		vi.mocked(createRequestHandler).mockImplementation((opts) => {
			capturedOptions = opts;
			return mockHandler;
		});

		const envMapper = (env: TestEnv): { db: string } => ({ db: env.DB });
		const handlerOptions = makeHandlerOptions();
		const worker = cloudflare<MatchableRoute, TestEnv, { db: string }>(handlerOptions, {
			env: envMapper,
		});

		const env: TestEnv = { DB: "my-db", CACHE: "my-cache" };
		const ctx = makeExecutionContext();

		await worker.fetch(new Request("https://example.com"), env, ctx);

		const mergedContext = await capturedOptions?.app.context(new Request("https://example.com"));

		expect(mergedContext).toEqual({
			existing: "value",
			db: "my-db",
			cloudflare: { ctx },
		});
	});

	test("ExecutionContext is available as cloudflare.ctx in the merged context", async () => {
		const mockHandler = vi.fn().mockResolvedValue(new Response("ok"));
		let capturedOptions: RequestHandlerOptions | undefined;
		vi.mocked(createRequestHandler).mockImplementation((opts) => {
			capturedOptions = opts;
			return mockHandler;
		});

		const handlerOptions = makeHandlerOptions();
		const worker = cloudflare(handlerOptions);

		const ctx = makeExecutionContext();
		await worker.fetch(new Request("https://example.com"), {}, ctx);

		const mergedContext = await capturedOptions?.app.context(new Request("https://example.com"));

		expect(mergedContext).toMatchObject({ cloudflare: { ctx } });
	});

	test("works without env mapping option", async () => {
		const mockHandler = vi.fn().mockResolvedValue(new Response("ok"));
		let capturedOptions: RequestHandlerOptions | undefined;
		vi.mocked(createRequestHandler).mockImplementation((opts) => {
			capturedOptions = opts;
			return mockHandler;
		});

		const handlerOptions = makeHandlerOptions();
		const worker = cloudflare(handlerOptions);

		const ctx = makeExecutionContext();
		await worker.fetch(new Request("https://example.com"), { RAW: "value" }, ctx);

		const mergedContext = await capturedOptions?.app.context(new Request("https://example.com"));

		expect(mergedContext).toEqual({
			existing: "value",
			cloudflare: { ctx },
		});
	});

	test("preserves original app context values alongside env-derived values", async () => {
		const mockHandler = vi.fn().mockResolvedValue(new Response("ok"));
		let capturedOptions: RequestHandlerOptions | undefined;
		vi.mocked(createRequestHandler).mockImplementation((opts) => {
			capturedOptions = opts;
			return mockHandler;
		});

		const handlerOptions = makeHandlerOptions();
		vi.mocked(handlerOptions.app.context).mockResolvedValue({
			session: "abc123",
			locale: "en",
		});

		const envMapper = (env: TestEnv): { db: string } => ({ db: env.DB });
		const worker = cloudflare<MatchableRoute, TestEnv, { db: string }>(handlerOptions, {
			env: envMapper,
		});

		const ctx = makeExecutionContext();
		await worker.fetch(new Request("https://example.com"), { DB: "prod-db", CACHE: "" }, ctx);

		const mergedContext = await capturedOptions?.app.context(new Request("https://example.com"));

		expect(mergedContext).toEqual({
			session: "abc123",
			locale: "en",
			db: "prod-db",
			cloudflare: { ctx },
		});
	});
});
