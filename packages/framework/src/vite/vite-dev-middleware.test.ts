import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";

import type { ViteDevServer } from "vite";
import { describe, expect, test, vi } from "vitest";

import { createDevMiddleware } from "./vite-dev-middleware";

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type ConnectIncomingMessage = IncomingMessage & { originalUrl?: string };

function createMockRequest(options: {
	method?: string;
	url?: string;
	originalUrl?: string;
	headers?: Record<string, string>;
	body?: string;
}): ConnectIncomingMessage {
	const { method = "GET", url = "/", originalUrl, headers = {}, body } = options;
	const socket = new Socket();
	const req = new IncomingMessage(socket) as ConnectIncomingMessage;
	req.method = method;
	req.url = url;
	req.headers = { host: "localhost:3000", ...headers };

	if (originalUrl !== undefined) {
		req.originalUrl = originalUrl;
	}

	if (METHODS_WITH_BODY.has(method)) {
		if (body !== undefined) {
			req.push(body);
		}
		req.push(null);
	}

	return req;
}

function createMockResponse(): {
	res: ServerResponse;
	getOutput: () => { statusCode: number; headers: Record<string, string>; body: string };
} {
	const chunks: Buffer[] = [];
	let statusCode = 200;
	const responseHeaders: Record<string, string> = {};

	const socket = new Socket();
	const res = new ServerResponse(new IncomingMessage(socket));

	const originalWriteHead = res.writeHead.bind(res);
	res.writeHead = ((code: number, hdrs?: Record<string, string>) => {
		statusCode = code;
		if (hdrs !== undefined) {
			for (const [k, v] of Object.entries(hdrs)) {
				responseHeaders[k] = v;
			}
		}
		return originalWriteHead(code, hdrs);
	}) as typeof res.writeHead;

	const originalEnd = res.end.bind(res);
	res.end = ((chunk?: unknown) => {
		if (typeof chunk === "string") {
			chunks.push(Buffer.from(chunk));
		} else if (chunk instanceof Buffer) {
			chunks.push(chunk);
		}
		return originalEnd();
	}) as typeof res.end;

	return {
		res,
		getOutput: () => ({
			statusCode,
			headers: responseHeaders,
			body: Buffer.concat(chunks).toString(),
		}),
	};
}

type MockServer = {
	ssrLoadModule: ReturnType<typeof vi.fn>;
	transformIndexHtml: ReturnType<typeof vi.fn>;
	middlewares: { use: ReturnType<typeof vi.fn> };
};

function createMockServer(overrides?: {
	appModule?: Record<string, unknown>;
	routesModule?: Record<string, unknown>;
	frameworkModule?: Record<string, unknown>;
	transformHtml?: (url: string, html: string) => string;
}): MockServer {
	const {
		appModule = { app: { context: () => ({}) } },
		routesModule = { routes: [], templates: {} },
		frameworkModule = {
			createHandler: () => ({
				fetch: () => Promise.resolve(new Response("OK")),
			}),
		},
		transformHtml = (_url: string, html: string) => html,
	} = overrides ?? {};

	const ssrLoadModule = vi.fn().mockImplementation((id: string) => {
		if (id.endsWith("app.ts")) {
			return Promise.resolve(appModule);
		}
		if (id.endsWith("routes.gen.ts")) {
			return Promise.resolve(routesModule);
		}
		if (id === "@sundayceo/framework") {
			return Promise.resolve(frameworkModule);
		}
		return Promise.resolve({});
	});

	return {
		ssrLoadModule,
		transformIndexHtml: vi.fn().mockImplementation(transformHtml),
		middlewares: { use: vi.fn() },
	};
}

function installMiddleware(server: MockServer, srcDir = "/app/src"): void {
	const install = createDevMiddleware({
		server: server as unknown as ViteDevServer,
		srcDir,
	});
	install();
}

function getMiddlewareFn(
	server: MockServer,
): (req: ConnectIncomingMessage, res: ServerResponse, next: () => void) => void {
	return server.middlewares.use.mock.calls.at(0)?.at(0) as (
		req: ConnectIncomingMessage,
		res: ServerResponse,
		next: () => void,
	) => void;
}

async function dispatch(
	server: MockServer,
	req: ConnectIncomingMessage,
): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
	installMiddleware(server);
	const middleware = getMiddlewareFn(server);
	const { res, getOutput } = createMockResponse();

	await new Promise<void>((resolve) => {
		const originalEnd = res.end.bind(res);
		res.end = ((chunk?: unknown) => {
			const result = (originalEnd as (chunk?: unknown) => ServerResponse)(chunk);
			resolve();
			return result;
		}) as typeof res.end;
		middleware(req, res, () => {
			resolve();
		});
	});

	return getOutput();
}

describe("createDevMiddleware", () => {
	test("registers middleware on server.middlewares", () => {
		const server = createMockServer();
		installMiddleware(server);

		expect(server.middlewares.use).toHaveBeenCalledOnce();
		expect(typeof server.middlewares.use.mock.calls.at(0)?.at(0)).toBe("function");
	});

	test("loads app.ts via ssrLoadModule", async () => {
		const server = createMockServer();
		const req = createMockRequest({ url: "/test" });

		await dispatch(server, req);

		expect(server.ssrLoadModule).toHaveBeenCalledWith(expect.stringContaining("app.ts"));
	});

	test("loads routes.gen.ts via ssrLoadModule", async () => {
		const server = createMockServer();
		const req = createMockRequest({ url: "/test" });

		await dispatch(server, req);

		expect(server.ssrLoadModule).toHaveBeenCalledWith(expect.stringContaining("routes.gen.ts"));
	});

	test("loads @sundayceo/framework via ssrLoadModule", async () => {
		const server = createMockServer();
		const req = createMockRequest({ url: "/test" });

		await dispatch(server, req);

		expect(server.ssrLoadModule).toHaveBeenCalledWith("@sundayceo/framework");
	});

	test("calls createHandler with app, routes, templates, errorPages, and hydrationManifest", async () => {
		const mockRoutes = [{ routePath: "/", params: [], loadModule: vi.fn() }];
		const mockTemplates = { main: vi.fn() };
		const mockErrorPages = { 404: vi.fn(), 500: vi.fn() };
		const mockHydrationManifest = { "/": { main: true } };
		const mockApp = { context: () => ({}) };
		const createHandler = vi.fn().mockReturnValue({
			fetch: () => Promise.resolve(new Response("OK")),
		});

		const server = createMockServer({
			appModule: { app: mockApp },
			routesModule: {
				routes: mockRoutes,
				templates: mockTemplates,
				errorPages: mockErrorPages,
				hydrationManifest: mockHydrationManifest,
			},
			frameworkModule: { createHandler },
		});

		const req = createMockRequest({ url: "/" });
		await dispatch(server, req);

		expect(createHandler).toHaveBeenCalledWith({
			app: mockApp,
			routes: mockRoutes,
			templates: mockTemplates,
			errorPages: mockErrorPages,
			hydrationManifest: mockHydrationManifest,
		});
	});

	test("writes non-HTML response directly", async () => {
		const server = createMockServer({
			frameworkModule: {
				createHandler: () => ({
					fetch: () =>
						Promise.resolve(
							new Response(JSON.stringify({ ok: true }), {
								status: 200,
								headers: { "content-type": "application/json" },
							}),
						),
				}),
			},
		});

		const req = createMockRequest({ url: "/api/data" });
		const output = await dispatch(server, req);

		expect(output.statusCode).toBe(200);
		expect(output.headers["content-type"]).toBe("application/json");
		expect(output.body).toBe(JSON.stringify({ ok: true }));
		expect(server.transformIndexHtml).not.toHaveBeenCalled();
	});

	test("applies transformIndexHtml to HTML responses", async () => {
		const server = createMockServer({
			frameworkModule: {
				createHandler: () => ({
					fetch: () =>
						Promise.resolve(
							new Response("<html><body>hi</body></html>", {
								headers: { "content-type": "text/html" },
							}),
						),
				}),
			},
			transformHtml: (_url: string, html: string) =>
				html.replace("</body>", '<script type="module" src="/@vite/client"></script></body>'),
		});

		const req = createMockRequest({ url: "/page" });
		const output = await dispatch(server, req);

		expect(output.body).toContain("/@vite/client");
		expect(server.transformIndexHtml).toHaveBeenCalledWith("/page", "<html><body>hi</body></html>");
	});

	test("calls next() on error", async () => {
		const server = createMockServer({
			frameworkModule: {
				createHandler: () => ({
					fetch: () => Promise.reject(new Error("boom")),
				}),
			},
		});

		installMiddleware(server);
		const middleware = getMiddlewareFn(server);
		const req = createMockRequest({ url: "/fail" });
		const { res } = createMockResponse();
		const next = vi.fn();

		await new Promise<void>((resolve) => {
			next.mockImplementation(() => {
				resolve();
			});
			middleware(req, res, next);
		});

		expect(next).toHaveBeenCalledOnce();
	});

	test("converts GET request preserving URL and method", async () => {
		let capturedRequest: Request | null = null;
		const server = createMockServer({
			frameworkModule: {
				createHandler: () => ({
					fetch: (request: Request) => {
						capturedRequest = request;
						return Promise.resolve(new Response("OK"));
					},
				}),
			},
		});

		const req = createMockRequest({
			url: "/about",
			headers: { host: "localhost:5173" },
		});
		await dispatch(server, req);

		expect(capturedRequest).not.toBeNull();
		expect(capturedRequest!.url).toBe("http://localhost:5173/about");
		expect(capturedRequest!.method).toBe("GET");
	});

	test("converts POST request preserving body", async () => {
		let capturedRequest: Request | null = null;
		const server = createMockServer({
			frameworkModule: {
				createHandler: () => ({
					fetch: (request: Request) => {
						capturedRequest = request;
						return Promise.resolve(new Response("OK"));
					},
				}),
			},
		});

		const body = JSON.stringify({ name: "test" });
		const req = createMockRequest({
			method: "POST",
			url: "/api/users",
			headers: { "content-type": "application/json" },
			body,
		});
		await dispatch(server, req);

		expect(capturedRequest).not.toBeNull();
		expect(capturedRequest!.method).toBe("POST");
		expect(capturedRequest!.body).not.toBeNull();
	});

	test("uses originalUrl when available", async () => {
		let capturedRequest: Request | null = null;
		const server = createMockServer({
			frameworkModule: {
				createHandler: () => ({
					fetch: (request: Request) => {
						capturedRequest = request;
						return Promise.resolve(new Response("OK"));
					},
				}),
			},
		});

		const req = createMockRequest({
			url: "/index.html",
			originalUrl: "/",
			headers: { host: "localhost:5173" },
		});
		await dispatch(server, req);

		expect(capturedRequest).not.toBeNull();
		expect(capturedRequest!.url).toBe("http://localhost:5173/");
	});

	test("writes empty body response correctly", async () => {
		const server = createMockServer({
			frameworkModule: {
				createHandler: () => ({
					fetch: () => Promise.resolve(new Response(null, { status: 204 })),
				}),
			},
		});

		const req = createMockRequest({ url: "/api/delete" });
		const output = await dispatch(server, req);

		expect(output.statusCode).toBe(204);
		expect(output.body).toBe("");
	});

	test("forwards request headers to Web Request", async () => {
		let capturedRequest: Request | null = null;
		const server = createMockServer({
			frameworkModule: {
				createHandler: () => ({
					fetch: (request: Request) => {
						capturedRequest = request;
						return Promise.resolve(new Response("OK"));
					},
				}),
			},
		});

		const req = createMockRequest({
			headers: {
				"content-type": "application/json",
				accept: "text/html",
			},
		});
		await dispatch(server, req);

		expect(capturedRequest!.headers.get("content-type")).toBe("application/json");
		expect(capturedRequest!.headers.get("accept")).toBe("text/html");
	});

	test("uses default export from app module when named export not available", async () => {
		const mockApp = { context: () => ({}) };
		const createHandler = vi.fn().mockReturnValue({
			fetch: () => Promise.resolve(new Response("OK")),
		});

		const server = createMockServer({
			appModule: { default: mockApp },
			frameworkModule: { createHandler },
		});

		const req = createMockRequest({ url: "/" });
		await dispatch(server, req);

		expect(createHandler).toHaveBeenCalledWith(expect.objectContaining({ app: mockApp }));
	});
});
