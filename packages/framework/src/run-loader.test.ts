import { describe, expect, test } from "vitest";

import { runLoader } from "./run-loader";

describe("runLoader", () => {
	test("calls loader with merged context including params and custom context", async () => {
		const request = new Request("https://example.com/blog/hello");
		const pageModule = {
			loader: (ctx: { request: Request; params: Record<string, string>; db: string }) => ({
				title: `Post: ${ctx.params.slug}`,
				db: ctx.db,
			}),
		};

		const result = await runLoader({
			pageModule,
			params: { slug: "hello" },
			request,
			appContext: { db: "test-db" },
		});

		expect(result).toEqual({ title: "Post: hello", db: "test-db" });
	});

	test("calls loader with empty params and request", async () => {
		const request = new Request("https://example.com/");
		const pageModule = {
			loader: (ctx: { request: Request; params: Record<string, string> }) => ({
				url: ctx.request.url,
				paramCount: Object.keys(ctx.params).length,
			}),
		};

		const result = await runLoader({
			pageModule,
			params: {},
			request,
			appContext: {},
		});

		expect(result).toEqual({ url: "https://example.com/", paramCount: 0 });
	});

	test("returns undefined when page has no loader", async () => {
		const request = new Request("https://example.com/static");
		const pageModule = {};

		const result = await runLoader({
			pageModule,
			params: {},
			request,
			appContext: {},
		});

		expect(result).toBeUndefined();
	});

	test("propagates errors thrown by the loader", async () => {
		const request = new Request("https://example.com/fail");
		const pageModule = {
			loader: () => {
				throw new Error("loader failed");
			},
		};

		await expect(
			runLoader({
				pageModule,
				params: {},
				request,
				appContext: {},
			}),
		).rejects.toThrow("loader failed");
	});

	test("handles async loaders", async () => {
		const request = new Request("https://example.com/async");
		const pageModule = {
			loader: async (ctx: { request: Request; params: Record<string, string> }) => {
				return { url: ctx.request.url };
			},
		};

		const result = await runLoader({
			pageModule,
			params: {},
			request,
			appContext: {},
		});

		expect(result).toEqual({ url: "https://example.com/async" });
	});
});
