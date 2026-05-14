import { describe, expect, test, vi } from "vitest";

import type { AppConfig } from "./create-app";
import type { HandlerModule, PageModule, TemplateComponent } from "./core/index";
import type { RouteEntry } from "./route-scanner";
import { createRequestHandler } from "./create-request-handler";
import { HttpErrorResponse, RedirectResponse } from "./throwable-response";

const pageRoute: RouteEntry = {
	pattern: "/home",
	params: [],
	filePath: "home/index.tsx",
};

const dynamicPageRoute: RouteEntry = {
	pattern: "/posts/:id",
	params: ["id"],
	filePath: "posts/[id].tsx",
};

const handlerRoute: RouteEntry = {
	pattern: "/api/data",
	params: [],
	filePath: "api/data.tsx",
};

function makePageModule(overrides?: Partial<PageModule>): PageModule {
	return {
		template: "default",
		loader: vi.fn().mockResolvedValue({ title: "Hello" }),
		defineSlots: vi.fn().mockReturnValue({}),
		...overrides,
	};
}

function makeHandlerModule(methods: Partial<HandlerModule> = {}): HandlerModule {
	return {
		GET: vi.fn().mockResolvedValue(new Response("ok")),
		...methods,
	};
}

function makeApp(
	overrides?: Partial<AppConfig<Record<string, unknown>>>,
): AppConfig<Record<string, unknown>> {
	return {
		context: vi.fn().mockResolvedValue({}),
		...overrides,
	};
}

const fakeTemplate: TemplateComponent = () => null;

const fakeRenderedResponse = new Response("<!DOCTYPE html><html></html>", {
	headers: { "content-type": "text/html;charset=utf-8" },
});

describe("createRequestHandler", () => {
	test("returns 404 when no route matches", async () => {
		const handler = createRequestHandler({
			app: makeApp(),
			getRoutes: () => [pageRoute],
			loadRouteModule: vi.fn(),
			loadTemplate: vi.fn(),
		});

		const response = await handler(new Request("https://example.com/unknown"));

		expect(response.status).toBe(404);
		const body = await response.text();
		expect(body).toContain("Not Found");
	});

	test("page route: calls loader, renders with template, returns HTML response", async () => {
		const pageModule = makePageModule();
		const loadRouteModule = vi.fn().mockResolvedValue(pageModule);
		const loadTemplate = vi.fn().mockResolvedValue(fakeTemplate);

		const handler = createRequestHandler({
			app: makeApp(),
			getRoutes: () => [pageRoute],
			loadRouteModule,
			loadTemplate,
		});

		const response = await handler(new Request("https://example.com/home"));

		expect(loadRouteModule).toHaveBeenCalledWith(pageRoute);
		expect(loadTemplate).toHaveBeenCalledWith("default");
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("text/html;charset=utf-8");
	});

	test("page route without loader: renders with undefined loaderData", async () => {
		const pageModule = makePageModule({
			loader: undefined as unknown as PageModule["loader"],
		});
		const loadRouteModule = vi.fn().mockResolvedValue(pageModule);
		const loadTemplate = vi.fn().mockResolvedValue(fakeTemplate);

		const handler = createRequestHandler({
			app: makeApp(),
			getRoutes: () => [pageRoute],
			loadRouteModule,
			loadTemplate,
		});

		const response = await handler(new Request("https://example.com/home"));

		expect(response.status).toBe(200);
	});

	test("handler route: dispatches to correct HTTP method (GET)", async () => {
		const getHandler = vi.fn().mockReturnValue(new Response("get result"));
		const handlerModule = makeHandlerModule({ GET: getHandler });
		const loadRouteModule = vi.fn().mockResolvedValue(handlerModule);

		const handler = createRequestHandler({
			app: makeApp(),
			getRoutes: () => [handlerRoute],
			loadRouteModule,
			loadTemplate: vi.fn(),
		});

		const response = await handler(new Request("https://example.com/api/data"));

		expect(getHandler).toHaveBeenCalled();
		expect(await response.text()).toBe("get result");
	});

	test("handler route: dispatches to correct HTTP method (POST)", async () => {
		const postHandler = vi.fn().mockReturnValue(new Response("post result"));
		const handlerModule = makeHandlerModule({ GET: undefined, POST: postHandler });
		const loadRouteModule = vi.fn().mockResolvedValue(handlerModule);

		const handler = createRequestHandler({
			app: makeApp(),
			getRoutes: () => [handlerRoute],
			loadRouteModule,
			loadTemplate: vi.fn(),
		});

		const response = await handler(
			new Request("https://example.com/api/data", { method: "POST" }),
		);

		expect(postHandler).toHaveBeenCalled();
		expect(await response.text()).toBe("post result");
	});

	test("handler route: returns 405 for unsupported method", async () => {
		const handlerModule = makeHandlerModule({ GET: vi.fn() });
		const loadRouteModule = vi.fn().mockResolvedValue(handlerModule);

		const handler = createRequestHandler({
			app: makeApp(),
			getRoutes: () => [handlerRoute],
			loadRouteModule,
			loadTemplate: vi.fn(),
		});

		const response = await handler(
			new Request("https://example.com/api/data", { method: "DELETE" }),
		);

		expect(response.status).toBe(405);
	});

	test("calls app.context() per request and merges into handler context", async () => {
		const contextFn = vi.fn().mockResolvedValue({ userId: "42" });
		const getHandler = vi.fn().mockReturnValue(new Response("ok"));
		const handlerModule = makeHandlerModule({ GET: getHandler });
		const loadRouteModule = vi.fn().mockResolvedValue(handlerModule);

		const handler = createRequestHandler({
			app: makeApp({ context: contextFn }),
			getRoutes: () => [handlerRoute],
			loadRouteModule,
			loadTemplate: vi.fn(),
		});

		const request = new Request("https://example.com/api/data");
		await handler(request);

		expect(contextFn).toHaveBeenCalledWith(request);
		const ctx = getHandler.mock.calls[0][0];
		expect(ctx.userId).toBe("42");
		expect(ctx.request).toBe(request);
	});

	test("redirect thrown in loader returns redirect Response", async () => {
		const pageModule = makePageModule({
			loader: () => {
				throw new RedirectResponse("/login");
			},
		});
		const loadRouteModule = vi.fn().mockResolvedValue(pageModule);
		const loadTemplate = vi.fn().mockResolvedValue(fakeTemplate);

		const handler = createRequestHandler({
			app: makeApp(),
			getRoutes: () => [pageRoute],
			loadRouteModule,
			loadTemplate,
		});

		const response = await handler(new Request("https://example.com/home"));

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("/login");
	});

	test("httpError thrown in handler returns error Response via resolveErrorPage", async () => {
		const getHandler = vi.fn().mockImplementation(() => {
			throw new HttpErrorResponse(404);
		});
		const handlerModule = makeHandlerModule({ GET: getHandler });
		const loadRouteModule = vi.fn().mockResolvedValue(handlerModule);

		const handler = createRequestHandler({
			app: makeApp(),
			getRoutes: () => [handlerRoute],
			loadRouteModule,
			loadTemplate: vi.fn(),
		});

		const response = await handler(new Request("https://example.com/api/data"));

		expect(response.status).toBe(404);
		const body = await response.text();
		expect(body).toContain("Not Found");
	});

	test("unknown error uses onError if provided", async () => {
		const thrownError = new Error("boom");
		const getHandler = vi.fn().mockImplementation(() => {
			throw thrownError;
		});
		const handlerModule = makeHandlerModule({ GET: getHandler });
		const loadRouteModule = vi.fn().mockResolvedValue(handlerModule);

		const onError = vi.fn().mockReturnValue(new Response("custom error", { status: 503 }));

		const handler = createRequestHandler({
			app: makeApp({ onError }),
			getRoutes: () => [handlerRoute],
			loadRouteModule,
			loadTemplate: vi.fn(),
		});

		const request = new Request("https://example.com/api/data");
		const response = await handler(request);

		expect(onError).toHaveBeenCalledWith(thrownError, request);
		expect(response.status).toBe(503);
	});

	test("unknown error falls back to 500 without onError", async () => {
		const getHandler = vi.fn().mockImplementation(() => {
			throw new Error("boom");
		});
		const handlerModule = makeHandlerModule({ GET: getHandler });
		const loadRouteModule = vi.fn().mockResolvedValue(handlerModule);

		const handler = createRequestHandler({
			app: makeApp(),
			getRoutes: () => [handlerRoute],
			loadRouteModule,
			loadTemplate: vi.fn(),
		});

		const response = await handler(new Request("https://example.com/api/data"));

		expect(response.status).toBe(500);
		const body = await response.text();
		expect(body).toContain("Internal Server Error");
	});
});
