import { describe, expect, test, vi } from "vitest";

import {
	RouteKind,
	type HandlerModule,
	type PageModule,
	type SlotMap,
	type TemplateComponent,
} from "./core/index";
import type { AppConfig } from "./create-app";
import {
	createHandler,
	type GeneratedErrorPages,
	type GeneratedRoute,
	type GeneratedTemplates,
} from "./create-handler";
import type { ErrorContext } from "./define-error-page";
import { HttpErrorResponse, RedirectResponse } from "./throwable-response";

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
			load: vi.fn().mockResolvedValue({ default: pageModule }),
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
			load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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
			load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ POST: postHandler }) }),
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
			load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: vi.fn() }) }),
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
			load: vi.fn().mockResolvedValue({ default: pageModule }),
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
			load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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
			pattern: "/api/data",
			load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
		});

		const onError = vi.fn();

		const handler = createHandler({
			app: makeApp({ onError }),
			routes: [route],
			templates: makeTemplates(),
		});

		const request = new Request("https://example.com/api/data");
		const response = await handler.fetch(request);

		expect(onError).toHaveBeenCalledWith(thrownError, request);
		expect(response.status).toBe(500);
		const body = await response.text();
		expect(body).toContain("Internal Server Error");
	});

	test("unhandled error returns 500 bare HTML without onError", async () => {
		const getHandler = vi.fn().mockImplementation(() => {
			throw new Error("boom");
		});
		const route = makeRoute({
			pattern: "/api/data",
			load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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
			load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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
			load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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
			load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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

	test("unwraps page module from ESM namespace default export", async () => {
		const pageModule = makePageModule();
		const route = makeRoute({
			pattern: "/about",
			load: vi.fn().mockResolvedValue({ default: pageModule }),
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

	test("unwraps handler module from ESM namespace default export", async () => {
		const getHandler = vi.fn().mockReturnValue(new Response("direct"));
		const route = makeRoute({
			pattern: "/api/test",
			load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
		});

		const handler = createHandler({
			app: makeApp(),
			routes: [route],
			templates: makeTemplates(),
		});

		const response = await handler.fetch(new Request("https://example.com/api/test"));

		expect(await response.text()).toBe("direct");
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
				pattern: "/api/data",
				load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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
				pattern: "/api/data",
				load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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
				pattern: "/api/data",
				load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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
				pattern: "/api/data",
				load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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
				pattern: "/api/data",
				load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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

		test("unhandled error populates ErrorContext.stack in dev mode", async () => {
			const thrownError = new Error("db connection failed");
			const errorPageModule = makeErrorPageModule();
			const getHandler = vi.fn().mockImplementation(() => {
				throw thrownError;
			});
			const route = makeRoute({
				pattern: "/api/data",
				load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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
		});

		test("unhandled error uses error.message in dev mode", async () => {
			const errorPageModule = makeErrorPageModule();
			const getHandler = vi.fn().mockImplementation(() => {
				throw new Error("specific failure reason");
			});
			const route = makeRoute({
				pattern: "/api/data",
				load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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
			expect(loaderArg.error.message).toBe("specific failure reason");
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

		test("unhandled error populates ErrorContext.error with thrown error", async () => {
			const thrownError = new Error("db connection failed");
			const errorPageModule = makeErrorPageModule();
			const getHandler = vi.fn().mockImplementation(() => {
				throw thrownError;
			});
			const route = makeRoute({
				pattern: "/api/data",
				load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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
			expect(loaderArg.error.error).toBe(thrownError);
		});

		test("httpError thrown renders through error page pipeline", async () => {
			const errorPageModule = makeErrorPageModule();
			const getHandler = vi.fn().mockImplementation(() => {
				throw new HttpErrorResponse(404);
			});
			const route = makeRoute({
				pattern: "/api/data",
				load: vi.fn().mockResolvedValue({ default: makeHandlerModule({ GET: getHandler }) }),
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

	describe("hydration manifest threading", () => {
		test("passes slotInteractivity from manifest to renderPage", async () => {
			const pageModule = makePageModule({
				defineSlots: vi.fn().mockReturnValue({
					main: "interactive content",
					header: "static content",
				}),
			});

			const route = makeRoute({
				pattern: "/demo",
				load: vi.fn().mockResolvedValue({ default: pageModule }),
			});

			const hydrationManifest = {
				"/demo": { main: true, header: false },
			};

			const handler = createHandler({
				app: makeApp(),
				routes: [route],
				templates: makeTemplates(),
				hydrationManifest,
			});

			const response = await handler.fetch(new Request("https://example.com/demo"));

			expect(response.status).toBe(200);
		});

		test("no hydration data when manifest is omitted", async () => {
			const pageModule = makePageModule();
			const route = makeRoute({
				load: vi.fn().mockResolvedValue({ default: pageModule }),
			});

			const handler = createHandler({
				app: makeApp(),
				routes: [route],
				templates: makeTemplates(),
			});

			const response = await handler.fetch(new Request("https://example.com/"));

			expect(response.status).toBe(200);
		});
	});
});
