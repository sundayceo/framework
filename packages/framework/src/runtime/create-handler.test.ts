import { describe, expect, test, vi } from "vitest";

import type { AppConfig } from "./create-app";
import { createHandler, type GeneratedTemplates, type RouteEntry } from "./create-handler";
import type { ErrorContext } from "./define-error-page";
import type { GeneratedErrorPages } from "./handle-error";
import { HttpErrorResponse, RedirectResponse } from "./throwable-response";
import {
	RouteKind,
	type HandlerModule,
	type PageModule,
	type SlotMap,
	type TemplateComponent,
} from "./types";

const fakeTemplate: TemplateComponent = () => null;

function makePageModule(overrides?: Partial<PageModule>): PageModule {
	return {
		[RouteKind]: "page",
		template: "default",
		loader: vi.fn().mockResolvedValue({ title: "Hello" }),
		defineSlots: vi.fn().mockReturnValue({}),
		...overrides,
	};
}

function makeHandlerModule(methods: Omit<HandlerModule, RouteKind>): HandlerModule {
	return { [RouteKind]: "handler", ...methods };
}

function makeApp(overrides?: Partial<AppConfig>): AppConfig {
	return {
		context: vi.fn().mockResolvedValue({}),
		...overrides,
	};
}

function makeRoute(
	overrides: Partial<RouteEntry> & { loadModule: RouteEntry["loadModule"] },
): RouteEntry {
	return {
		routePath: "/",
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
			routePath: "/home",
			loadModule: vi.fn().mockResolvedValue({ default: pageModule }),
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

	test.each([
		{ method: "GET", label: "GET" },
		{ method: "POST", label: "POST" },
	])("handler route: dispatches $label by HTTP method", async ({ method }) => {
		const methodHandler = vi.fn().mockReturnValue(new Response(`${method} result`));
		const route = makeRoute({
			routePath: "/api/data",
			loadModule: vi
				.fn()
				.mockResolvedValue({ default: makeHandlerModule({ [method]: methodHandler }) }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(
			new Request("https://example.com/api/data", { method }),
		);

		expect(methodHandler).toHaveBeenCalled();
		expect(await response.text()).toBe(`${method} result`);
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
			routePath: "/api/data",
			loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: vi.fn() }) }),
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
		const allow = response.headers.get("allow") ?? "";
		expect(allow).toContain("GET");
	});

	test("HEAD request returns GET response headers without body", async () => {
		const getHandler = vi
			.fn()
			.mockReturnValue(new Response("body content", { headers: { "x-custom": "yes" } }));
		const route = makeRoute({
			routePath: "/api/data",
			loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(
			new Request("https://example.com/api/data", { method: "HEAD" }),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("x-custom")).toBe("yes");
		expect(await response.text()).toBe("");
	});

	test("OPTIONS request returns allowed methods", async () => {
		const route = makeRoute({
			routePath: "/api/data",
			loadModule: vi
				.fn()
				.mockResolvedValue({ default: makeHandlerModule({ GET: vi.fn(), POST: vi.fn() }) }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(
			new Request("https://example.com/api/data", { method: "OPTIONS" }),
		);

		const allow = response.headers.get("allow") ?? "";
		expect(allow).toContain("GET");
		expect(allow).toContain("POST");
		expect(allow).toContain("HEAD");
		expect(allow).toContain("OPTIONS");
	});

	test("OPTIONS without GET does not include HEAD in allowed methods", async () => {
		const route = makeRoute({
			routePath: "/api/data",
			loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ POST: vi.fn() }) }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(
			new Request("https://example.com/api/data", { method: "OPTIONS" }),
		);

		const allow = response.headers.get("allow") ?? "";
		expect(allow).toContain("POST");
		expect(allow).toContain("OPTIONS");
		expect(allow).not.toContain("HEAD");
	});

	test("HEAD returns 405 when no GET handler exists", async () => {
		const route = makeRoute({
			routePath: "/api/data",
			loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ POST: vi.fn() }) }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(
			new Request("https://example.com/api/data", { method: "HEAD" }),
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
			routePath: "/home",
			loadModule: vi.fn().mockResolvedValue({ default: pageModule }),
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
			routePath: "/api/data",
			loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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

	test("unhandled error calls onError as side-effect then returns 500", async () => {
		const thrownError = new Error("boom");
		const getHandler = vi.fn().mockImplementation(() => {
			throw thrownError;
		});
		const route = makeRoute({
			routePath: "/api/data",
			loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
		});

		// With onError: calls onError then returns 500
		const onError = vi.fn();
		const handlerWithOnError = createHandler({
			app: makeApp({ onError }),
			routes: [route],
			templates: makeTemplates(),
		});

		const request = new Request("https://example.com/api/data");
		const response = await handlerWithOnError.fetch(request);

		expect(onError).toHaveBeenCalledWith(thrownError, request);
		expect(response.status).toBe(500);
		const body = await response.text();
		expect(body).toContain("Internal Server Error");

		// Without onError: still returns 500 bare HTML
		const handlerWithoutOnError = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response2 = await handlerWithoutOnError.fetch(
			new Request("https://example.com/api/data"),
		);

		expect(response2.status).toBe(500);
		const body2 = await response2.text();
		expect(body2).toContain("Internal Server Error");
	});

	test("platform context forwarded to app.context", async () => {
		const contextFn = vi.fn().mockResolvedValue({ userId: "42" });
		const getHandler = vi.fn().mockReturnValue(new Response("ok"));
		const route = makeRoute({
			routePath: "/api/data",
			loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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
			routePath: "/api/data",
			loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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
			routePath: "/posts/:id",
			params: ["id"],
			loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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

	describe("error pages", () => {
		type MetaValue =
			| { title?: string; description?: string }
			| ((args: { loaderData: unknown }) => { title?: string; description?: string });

		type ErrorPageModuleShape = {
			template: string;
			loader?: (ctx: { error: ErrorContext }) => unknown;
			defineSlots: (args: { loaderData: unknown }) => SlotMap;
			meta?: MetaValue;
		};

		function makeErrorPageModule(overrides?: Partial<ErrorPageModuleShape>): ErrorPageModuleShape {
			return {
				template: "default",
				loader: vi.fn(({ error }: { error: ErrorContext }) => ({
					title: `${error.status} Error`,
					message: error.message,
				})),
				defineSlots: vi.fn().mockReturnValue({}),
				...overrides,
			};
		}

		function makeErrorPages(pages: Record<number, ErrorPageModuleShape>): GeneratedErrorPages {
			const result: GeneratedErrorPages = {};
			for (const [status, mod] of Object.entries(pages)) {
				result[Number(status)] = () => Promise.resolve({ default: mod });
			}
			return result;
		}

		test("500 error renders through error page when errorPages provided", async () => {
			const errorPageModule = makeErrorPageModule();
			const getHandler = vi.fn().mockImplementation(() => {
				throw new Error("boom");
			});
			const route = makeRoute({
				routePath: "/api/data",
				loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
			});

			const handler = createHandler({
				app: makeApp(),
				routes: [route],
				templates: makeTemplates(),
				errorPages: makeErrorPages({ 500: errorPageModule }),
			});

			const response = await handler.fetch(new Request("https://example.com/api/data"));

			expect(response.status).toBe(500);
			expect(response.headers.get("content-type")).toBe("text/html;charset=utf-8");
			expect(errorPageModule.loader).toHaveBeenCalled();
			const loaderArg = (errorPageModule.loader as ReturnType<typeof vi.fn>).mock.calls
				.at(0)!
				.at(0);
			expect(loaderArg.error.status).toBe(500);
			expect(loaderArg.error.message).toBe("boom");
		});

		test("404 renders through error page when errorPages has 404 entry", async () => {
			const errorPageModule = makeErrorPageModule();

			const handler = createHandler({
				app: makeApp(),
				routes: [],
				templates: makeTemplates(),
				errorPages: makeErrorPages({ 404: errorPageModule }),
			});

			const response = await handler.fetch(new Request("https://example.com/unknown"));

			expect(response.status).toBe(404);
			expect(response.headers.get("content-type")).toBe("text/html;charset=utf-8");
			expect(errorPageModule.loader).toHaveBeenCalled();
			const loaderArg = (errorPageModule.loader as ReturnType<typeof vi.fn>).mock.calls
				.at(0)!
				.at(0);
			expect(loaderArg.error.status).toBe(404);
			expect(loaderArg.error.message).toBe("Not Found");
		});

		test("circuit breaker: error page that throws falls back to bare HTML", async () => {
			const brokenErrorPage = makeErrorPageModule({
				loader: vi.fn().mockImplementation(() => {
					throw new Error("error page broke");
				}),
			});
			const getHandler = vi.fn().mockImplementation(() => {
				throw new Error("boom");
			});
			const route = makeRoute({
				routePath: "/api/data",
				loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
			});

			const handler = createHandler({
				app: makeApp(),
				routes: [route],
				templates: makeTemplates(),
				errorPages: makeErrorPages({ 500: brokenErrorPage }),
			});

			const response = await handler.fetch(new Request("https://example.com/api/data"));

			expect(response.status).toBe(500);
			const body = await response.text();
			expect(body).toContain("Internal Server Error");
		});

		test("onError called as side-effect before error page renders", async () => {
			const callOrder: string[] = [];
			const errorPageModule = makeErrorPageModule({
				loader: vi.fn().mockImplementation(() => {
					callOrder.push("loader");
					return { title: "Error" };
				}),
			});
			const thrownError = new Error("boom");
			const getHandler = vi.fn().mockImplementation(() => {
				throw thrownError;
			});
			const route = makeRoute({
				routePath: "/api/data",
				loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
			});

			const onError = vi.fn().mockImplementation(() => {
				callOrder.push("onError");
			});

			const handler = createHandler({
				app: makeApp({ onError }),
				routes: [route],
				templates: makeTemplates(),
				errorPages: makeErrorPages({ 500: errorPageModule }),
			});

			const request = new Request("https://example.com/api/data");
			const response = await handler.fetch(request);

			expect(onError).toHaveBeenCalledWith(thrownError, request);
			expect(callOrder).toEqual(["onError", "loader"]);
			expect(response.status).toBe(500);
			expect(errorPageModule.defineSlots).toHaveBeenCalled();
		});

		test("onError throwing does not prevent error page rendering", async () => {
			const errorPageModule = makeErrorPageModule();
			const getHandler = vi.fn().mockImplementation(() => {
				throw new Error("boom");
			});
			const route = makeRoute({
				routePath: "/api/data",
				loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
			});

			const onError = vi.fn().mockImplementation(() => {
				throw new Error("onError broke");
			});

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());

			const handler = createHandler({
				app: makeApp({ onError }),
				routes: [route],
				templates: makeTemplates(),
				errorPages: makeErrorPages({ 500: errorPageModule }),
			});

			const response = await handler.fetch(new Request("https://example.com/api/data"));

			expect(response.status).toBe(500);
			expect(errorPageModule.loader).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		test("falls back to bare HTML when no custom error page for status", async () => {
			const getHandler = vi.fn().mockImplementation(() => {
				throw new Error("boom");
			});
			const route = makeRoute({
				routePath: "/api/data",
				loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
			});

			const handler = createHandler({
				app: makeApp(),
				routes: [route],
				templates: makeTemplates(),
				errorPages: {},
			});

			const response = await handler.fetch(new Request("https://example.com/api/data"));

			expect(response.status).toBe(500);
			const body = await response.text();
			expect(body).toContain("Internal Server Error");
		});

		test("unhandled error populates ErrorContext fields in dev mode", async () => {
			const thrownError = new Error("db connection failed");
			const errorPageModule = makeErrorPageModule();
			const getHandler = vi.fn().mockImplementation(() => {
				throw thrownError;
			});
			const route = makeRoute({
				routePath: "/api/data",
				loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
			});

			const handler = createHandler({
				app: makeApp(),
				routes: [route],
				templates: makeTemplates(),
				errorPages: makeErrorPages({ 500: errorPageModule }),
			});

			await handler.fetch(new Request("https://example.com/api/data"));

			const loaderArg = (errorPageModule.loader as ReturnType<typeof vi.fn>).mock.calls
				.at(0)!
				.at(0);
			expect(loaderArg.error.stack).toBeDefined();
			expect(loaderArg.error.stack).toContain("db connection failed");
			expect(loaderArg.error.message).toBe("db connection failed");
			expect(loaderArg.error.error).toBe(thrownError);
		});

		test("404 error page has no error or stack in ErrorContext", async () => {
			const errorPageModule = makeErrorPageModule();

			const handler = createHandler({
				app: makeApp(),
				routes: [],
				templates: makeTemplates(),
				errorPages: makeErrorPages({ 404: errorPageModule }),
			});

			await handler.fetch(new Request("https://example.com/unknown"));

			const loaderArg = (errorPageModule.loader as ReturnType<typeof vi.fn>).mock.calls
				.at(0)!
				.at(0);
			expect(loaderArg.error.error).toBeUndefined();
			expect(loaderArg.error.stack).toBeUndefined();
			expect(loaderArg.error.message).toBe("Not Found");
		});

		test("httpError thrown renders through error page pipeline", async () => {
			const errorPageModule = makeErrorPageModule();
			const getHandler = vi.fn().mockImplementation(() => {
				throw new HttpErrorResponse(404);
			});
			const route = makeRoute({
				routePath: "/api/data",
				loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
			});

			const handler = createHandler({
				app: makeApp(),
				routes: [route],
				templates: makeTemplates(),
				errorPages: makeErrorPages({ 404: errorPageModule }),
			});

			const response = await handler.fetch(new Request("https://example.com/api/data"));

			expect(response.status).toBe(404);
			expect(errorPageModule.loader).toHaveBeenCalled();
		});
	});

	test.each([
		{ method: "POST", label: "POST" },
	])("$label to a page route returns 405", async ({ method }) => {
		const pageModule = makePageModule();
		const route = makeRoute({
			routePath: "/home",
			loadModule: vi.fn().mockResolvedValue({ default: pageModule }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(
			new Request("https://example.com/home", { method }),
		);

		expect(response.status).toBe(405);
		const allow = response.headers.get("allow") ?? "";
		expect(allow).toContain("GET");
		expect(allow).toContain("HEAD");
		expect(pageModule.loader).not.toHaveBeenCalled();
	});

	test("HEAD to a page route returns headers without body", async () => {
		const pageModule = makePageModule();
		const route = makeRoute({
			routePath: "/home",
			loadModule: vi.fn().mockResolvedValue({ default: pageModule }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(
			new Request("https://example.com/home", { method: "HEAD" }),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("text/html;charset=utf-8");
		expect(await response.text()).toBe("");
	});

	test("OPTIONS to a page route returns allowed methods", async () => {
		const pageModule = makePageModule();
		const route = makeRoute({
			routePath: "/home",
			loadModule: vi.fn().mockResolvedValue({ default: pageModule }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(
			new Request("https://example.com/home", { method: "OPTIONS" }),
		);

		const allow = response.headers.get("allow") ?? "";
		expect(allow).toContain("GET");
		expect(allow).toContain("HEAD");
		expect(allow).toContain("OPTIONS");
		expect(pageModule.loader).not.toHaveBeenCalled();
	});

	test("returns 405 for non-standard HTTP method on handler route", async () => {
		const route = makeRoute({
			routePath: "/api/data",
			loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: vi.fn() }) }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(
			new Request("https://example.com/api/data", { method: "FOOBAR" }),
		);

		expect(response.status).toBe(405);
	});

	test("invalid route module (neither page nor handler) returns 500", async () => {
		const route = makeRoute({
			routePath: "/broken",
			loadModule: vi.fn().mockResolvedValue({ default: { notAValidModule: true } }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(new Request("https://example.com/broken"));

		expect(response.status).toBe(500);
		const body = await response.text();
		expect(body).toContain("Internal Server Error");
	});

	test("page route with missing template returns 500", async () => {
		const pageModule = makePageModule({ template: "nonexistent" });
		const route = makeRoute({
			routePath: "/home",
			loadModule: vi.fn().mockResolvedValue({ default: pageModule }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(new Request("https://example.com/home"));

		expect(response.status).toBe(500);
		const body = await response.text();
		expect(body).toContain("Internal Server Error");
	});

	test("404 path gracefully handles app.context failure", async () => {
		const handler = createHandler({
			app: makeApp({
				context: vi.fn().mockRejectedValue(new Error("context broke")),
			}),
			routes: [],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(new Request("https://example.com/missing"));

		expect(response.status).toBe(404);
	});

	test("app.context throwing renders error page instead of crashing", async () => {
		const pageModule = makePageModule();
		const route = makeRoute({
			routePath: "/home",
			loadModule: vi.fn().mockResolvedValue({ default: pageModule }),
		});

		const handler = createHandler({
			app: makeApp({
				context: vi.fn().mockRejectedValue(new Error("context factory broke")),
			}),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(new Request("https://example.com/home"));

		expect(response.status).toBe(500);
		const body = await response.text();
		expect(body).toContain("Internal Server Error");
	});

	test("handler throwing non-Error value returns 500", async () => {
		const getHandler = vi.fn().mockImplementation(() => {
			throw "string error"; // eslint-disable-line @typescript-eslint/only-throw-error
		});
		const route = makeRoute({
			routePath: "/api/data",
			loadModule: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(new Request("https://example.com/api/data"));

		expect(response.status).toBe(500);
	});

	test("loadModule throwing renders error page instead of crashing", async () => {
		const route = makeRoute({
			routePath: "/home",
			loadModule: vi.fn().mockRejectedValue(new Error("module load failed")),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(new Request("https://example.com/home"));

		expect(response.status).toBe(500);
		const body = await response.text();
		expect(body).toContain("Internal Server Error");
	});
});
