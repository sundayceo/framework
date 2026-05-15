import { describe, expect, test, vi } from "vitest";

import type { PageModule, TemplateComponent } from "./core/index";
import type { AppConfig } from "./create-app";
import { createHandler, type GeneratedRoute, type GeneratedTemplates } from "./create-handler";
import { HttpErrorResponse, RedirectResponse } from "./throwable-response";

const fakeTemplate: TemplateComponent = () => null;

function makePageModule(overrides?: Partial<PageModule>): PageModule {
	return {
		template: "default",
		loader: vi.fn().mockResolvedValue({ title: "Hello" }),
		defineSlots: vi.fn().mockReturnValue({}),
		...overrides,
	};
}

function makeApp(overrides?: Partial<AppConfig>): AppConfig {
	return {
		context: vi.fn().mockResolvedValue({}),
		...overrides,
	};
}

function makeRoute(
	overrides: Partial<GeneratedRoute> & { load: GeneratedRoute["load"] },
): GeneratedRoute {
	return {
		pattern: "/",
		params: [],
		...overrides,
	};
}

function makeTemplates(template: TemplateComponent = fakeTemplate): GeneratedTemplates {
	return {
		default: vi.fn().mockResolvedValue({ default: template }),
	};
}

describe("createHandler", () => {
	test("page route: loads module, resolves template, renders HTML", async () => {
		const pageModule = makePageModule();
		const route = makeRoute({
			pattern: "/home",
			load: vi.fn().mockResolvedValue({ page: pageModule }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(new Request("https://example.com/home"));

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("text/html;charset=utf-8");
	});

	test("handler route: dispatches GET by HTTP method", async () => {
		const getHandler = vi.fn().mockReturnValue(new Response("get result"));
		const route = makeRoute({
			pattern: "/api/data",
			load: vi.fn().mockResolvedValue({ GET: getHandler }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(new Request("https://example.com/api/data"));

		expect(getHandler).toHaveBeenCalled();
		expect(await response.text()).toBe("get result");
	});

	test("handler route: dispatches POST by HTTP method", async () => {
		const postHandler = vi.fn().mockReturnValue(new Response("post result"));
		const route = makeRoute({
			pattern: "/api/data",
			load: vi.fn().mockResolvedValue({ POST: postHandler }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(
			new Request("https://example.com/api/data", { method: "POST" }),
		);

		expect(postHandler).toHaveBeenCalled();
		expect(await response.text()).toBe("post result");
	});

	test("returns 404 for unmatched routes", async () => {
		const handler = createHandler({
			app: makeApp(),
			routes: [],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(new Request("https://example.com/unknown"));

		expect(response.status).toBe(404);
		const body = await response.text();
		expect(body).toContain("Not Found");
	});

	test("returns 405 for unsupported handler methods", async () => {
		const route = makeRoute({
			pattern: "/api/data",
			load: vi.fn().mockResolvedValue({ GET: vi.fn() }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(
			new Request("https://example.com/api/data", { method: "DELETE" }),
		);

		expect(response.status).toBe(405);
	});

	test("redirect thrown in loader returns redirect Response", async () => {
		const pageModule = makePageModule({
			loader: () => {
				throw new RedirectResponse("/login");
			},
		});
		const route = makeRoute({
			pattern: "/home",
			load: vi.fn().mockResolvedValue({ page: pageModule }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(new Request("https://example.com/home"));

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("/login");
	});

	test("httpError thrown in handler returns bare HTML error page", async () => {
		const getHandler = vi.fn().mockImplementation(() => {
			throw new HttpErrorResponse(404);
		});
		const route = makeRoute({
			pattern: "/api/data",
			load: vi.fn().mockResolvedValue({ GET: getHandler }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(new Request("https://example.com/api/data"));

		expect(response.status).toBe(404);
		const body = await response.text();
		expect(body).toContain("Not Found");
	});

	test("unhandled error calls onError when provided", async () => {
		const thrownError = new Error("boom");
		const getHandler = vi.fn().mockImplementation(() => {
			throw thrownError;
		});
		const route = makeRoute({
			pattern: "/api/data",
			load: vi.fn().mockResolvedValue({ GET: getHandler }),
		});

		const onError = vi.fn().mockReturnValue(new Response("custom error", { status: 503 }));

		const handler = createHandler({
			app: makeApp({ onError }),
			routes: [route],
			templates: makeTemplates(),
		});

		const request = new Request("https://example.com/api/data");
		const response = await handler.fetch(request);

		expect(onError).toHaveBeenCalledWith(thrownError, request);
		expect(response.status).toBe(503);
	});

	test("unhandled error returns 500 bare HTML without onError", async () => {
		const getHandler = vi.fn().mockImplementation(() => {
			throw new Error("boom");
		});
		const route = makeRoute({
			pattern: "/api/data",
			load: vi.fn().mockResolvedValue({ GET: getHandler }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(new Request("https://example.com/api/data"));

		expect(response.status).toBe(500);
		const body = await response.text();
		expect(body).toContain("Internal Server Error");
	});

	test("platform context forwarded to app.context", async () => {
		const contextFn = vi.fn().mockResolvedValue({ userId: "42" });
		const getHandler = vi.fn().mockReturnValue(new Response("ok"));
		const route = makeRoute({
			pattern: "/api/data",
			load: vi.fn().mockResolvedValue({ GET: getHandler }),
		});

		const handler = createHandler({
			app: makeApp({ context: contextFn }),
			routes: [route],
			templates: makeTemplates(),
		});

		const request = new Request("https://example.com/api/data");
		const platform = { env: { SECRET: "abc" } };
		await handler.fetch(request, platform);

		expect(contextFn).toHaveBeenCalledWith(request, platform);
	});

	test("context factory output merged into request context", async () => {
		const contextFn = vi.fn().mockResolvedValue({ userId: "42" });
		const getHandler = vi.fn().mockReturnValue(new Response("ok"));
		const route = makeRoute({
			pattern: "/api/data",
			load: vi.fn().mockResolvedValue({ GET: getHandler }),
		});

		const handler = createHandler({
			app: makeApp({ context: contextFn }),
			routes: [route],
			templates: makeTemplates(),
		});

		const request = new Request("https://example.com/api/data");
		await handler.fetch(request);

		const ctx = getHandler.mock.calls.at(0)?.at(0);
		expect(ctx.userId).toBe("42");
		expect(ctx.request).toBe(request);
	});

	test("dynamic route params extracted and passed to handler", async () => {
		const getHandler = vi.fn().mockReturnValue(new Response("ok"));
		const route = makeRoute({
			pattern: "/posts/:id",
			params: ["id"],
			load: vi.fn().mockResolvedValue({ GET: getHandler }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		await handler.fetch(new Request("https://example.com/posts/123"));

		const ctx = getHandler.mock.calls.at(0)?.at(0);
		expect(ctx.params).toEqual({ id: "123" });
	});

	test("unwraps page module from ESM namespace with page export", async () => {
		const pageModule = makePageModule();
		const route = makeRoute({
			pattern: "/about",
			load: vi.fn().mockResolvedValue({ page: pageModule }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(new Request("https://example.com/about"));

		expect(response.status).toBe(200);
		expect(pageModule.loader).toHaveBeenCalled();
	});

	test("unwraps handler module from ESM namespace without page export", async () => {
		const getHandler = vi.fn().mockReturnValue(new Response("direct"));
		const route = makeRoute({
			pattern: "/api/test",
			load: vi.fn().mockResolvedValue({ GET: getHandler }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(new Request("https://example.com/api/test"));

		expect(await response.text()).toBe("direct");
	});
});
