import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

import type { ViteDevServer } from "vite";

import type { HandlerModule, PageModule, TemplateComponent } from "./core/index";
import type { AppConfig } from "./create-app";
import type { RequestHandlerOptions } from "./create-request-handler";
import { scanRoutes, type RouteEntry } from "./route-scanner";

const PROTOCOL = "http";
const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ROUTE_EXTENSIONS = [".tsx", ".ts"];

function buildHeaders(req: IncomingMessage): Headers {
	const headers = new Headers();
	for (const [key, value] of Object.entries(req.headers)) {
		if (value !== undefined) {
			const headerValue = Array.isArray(value) ? value.join(", ") : value;
			headers.set(key, headerValue);
		}
	}
	return headers;
}

function collectBody(req: IncomingMessage): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on("data", (chunk: Buffer) => {
			chunks.push(chunk);
		});
		req.on("end", () => {
			resolve(Buffer.concat(chunks));
		});
		req.on("error", (err) => {
			reject(err);
		});
	});
}

type ConnectIncomingMessage = IncomingMessage & { originalUrl?: string };

async function toWebRequest(req: ConnectIncomingMessage): Promise<Request> {
	const host = req.headers.host ?? "localhost";
	const pathname = req.originalUrl ?? req.url ?? "/";
	const url = `${PROTOCOL}://${host}${pathname}`;
	const method = req.method ?? "GET";
	const headers = buildHeaders(req);

	if (!METHODS_WITH_BODY.has(method)) {
		return new Request(url, { method, headers });
	}

	const body = await collectBody(req);
	return new Request(url, { method, headers, body: new Uint8Array(body) });
}

function collectHeaders(response: Response): Record<string, string> {
	const headers: Record<string, string> = {};
	response.headers.forEach((value, key) => {
		headers[key] = value;
	});
	return headers;
}

async function writeResponse(res: ServerResponse, response: Response): Promise<void> {
	const headers = collectHeaders(response);
	res.writeHead(response.status, headers);

	if (response.body === null) {
		res.end();
		return;
	}

	const text = await response.text();
	res.end(text);
}

function scanRoutesFromDisk(srcDir: string): RouteEntry[] {
	const routesDir = path.join(srcDir, "routes");

	if (!fs.existsSync(routesDir)) {
		return [];
	}

	const files = fs
		.readdirSync(routesDir, { recursive: true })
		.filter(
			(f): f is string => typeof f === "string" && ROUTE_EXTENSIONS.some((ext) => f.endsWith(ext)),
		);

	return scanRoutes(files).routes;
}

type MiddlewareInput = {
	server: ViteDevServer;
	srcDir: string;
};

type SsrLoaderInput = {
	server: ViteDevServer;
	srcDir: string;
};

function isAppConfig(value: unknown): value is AppConfig {
	return typeof value === "object" && value !== null && "context" in value;
}

function isPageModule(value: unknown): value is PageModule {
	return typeof value === "object" && value !== null && "template" in value;
}

function isTemplateComponent(value: unknown): value is TemplateComponent {
	return typeof value === "function";
}

function isHandlerModule(value: unknown): value is HandlerModule {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
	return methods.some((m) => m in value);
}

function pickExport(mod: Record<string, unknown>, ...keys: string[]): unknown {
	for (const key of keys) {
		if (key in mod) {
			return mod[key];
		}
	}
	return undefined;
}

async function loadAppConfig(input: SsrLoaderInput): Promise<AppConfig> {
	const appPath = path.join(input.srcDir, "app.ts");
	const mod: Record<string, unknown> = await input.server.ssrLoadModule(appPath);
	const app = pickExport(mod, "app", "default");
	if (!isAppConfig(app)) {
		throw new Error("app.ts must export an AppConfig (named 'app' or default)");
	}
	return app;
}

function createRouteModuleLoader(
	input: SsrLoaderInput,
): (route: RouteEntry) => Promise<PageModule | HandlerModule> {
	return async (route: RouteEntry): Promise<PageModule | HandlerModule> => {
		const absolutePath = path.join(input.srcDir, "routes", route.filePath);
		const mod: Record<string, unknown> = await input.server.ssrLoadModule(absolutePath);
		const routeModule = pickExport(mod, "page", "handler", "default");
		if (isPageModule(routeModule)) {
			return routeModule;
		}
		if (isHandlerModule(routeModule)) {
			return routeModule;
		}
		throw new Error(`Route ${route.filePath} must export 'page', 'handler', or a default module`);
	};
}

function createTemplateLoader(
	input: SsrLoaderInput,
): (templateId: string) => Promise<TemplateComponent> {
	return async (templateId: string): Promise<TemplateComponent> => {
		const templatePath = path.join(input.srcDir, "templates", `${templateId}.tsx`);
		const mod: Record<string, unknown> = await input.server.ssrLoadModule(templatePath);
		const template = pickExport(mod, "default");
		if (!isTemplateComponent(template)) {
			throw new Error(`Template ${templateId} must have a default export that is a component`);
		}
		return template;
	};
}

type ConnectMiddleware = (
	req: ConnectIncomingMessage,
	res: ServerResponse,
	next: () => void,
) => void;

function registerWatchers(input: {
	server: ViteDevServer;
	srcDir: string;
	onRouteChange: () => void;
}): void {
	const routesDir = path.join(input.srcDir, "routes");

	input.server.watcher.on("add", (file: string) => {
		if (file.startsWith(routesDir)) {
			input.onRouteChange();
		}
	});

	input.server.watcher.on("unlink", (file: string) => {
		if (file.startsWith(routesDir)) {
			input.onRouteChange();
		}
	});
}

function buildMiddleware(input: MiddlewareInput): ConnectMiddleware {
	const { server, srcDir } = input;
	let routes = scanRoutesFromDisk(srcDir);

	registerWatchers({
		server,
		srcDir,
		onRouteChange: () => {
			routes = scanRoutesFromDisk(srcDir);
		},
	});

	return (req: ConnectIncomingMessage, res: ServerResponse, next: () => void): void => {
		handleMiddlewareRequest({ server, srcDir, routes, req, res, next });
	};
}

type HandleInput = {
	server: ViteDevServer;
	srcDir: string;
	routes: RouteEntry[];
	req: ConnectIncomingMessage;
	res: ServerResponse;
	next: () => void;
};

type CreateRequestHandlerFn = (
	options: RequestHandlerOptions<RouteEntry>,
) => (request: Request) => Promise<Response>;

function isCreateRequestHandlerFn(value: unknown): value is CreateRequestHandlerFn {
	return typeof value === "function";
}

async function loadCreateRequestHandler(server: ViteDevServer): Promise<CreateRequestHandlerFn> {
	const mod: Record<string, unknown> = await server.ssrLoadModule("@sundayceo/framework");
	const fn = mod.createRequestHandler;
	if (!isCreateRequestHandlerFn(fn)) {
		throw new Error("@sundayceo/framework must export createRequestHandler");
	}
	return fn;
}

function isHtmlResponse(response: Response): boolean {
	return (response.headers.get("content-type") ?? "").includes("text/html");
}

async function dispatchRequest(input: HandleInput): Promise<void> {
	const { server, srcDir, routes, req, res, next } = input;
	try {
		const app = await loadAppConfig({ server, srcDir });
		const createHandler = await loadCreateRequestHandler(server);
		const handler = createHandler({
			app,
			getRoutes: () => routes,
			loadRouteModule: createRouteModuleLoader({ server, srcDir }),
			loadTemplate: createTemplateLoader({ server, srcDir }),
		});

		const webRequest = await toWebRequest(req);
		const response = await handler(webRequest);
		const url = req.originalUrl ?? req.url ?? "/";

		if (isHtmlResponse(response)) {
			const rawHtml = await response.text();
			const html = await server.transformIndexHtml(url, rawHtml);
			const headers = collectHeaders(response);
			res.writeHead(response.status, headers);
			res.end(html);
			return;
		}

		await writeResponse(res, response);
	} catch {
		next();
	}
}

function handleMiddlewareRequest(input: HandleInput): void {
	void dispatchRequest(input);
}

function createDevMiddleware(input: MiddlewareInput): () => void {
	const middleware = buildMiddleware(input);

	return (): void => {
		input.server.middlewares.use(middleware);
	};
}

export { createDevMiddleware, toWebRequest, writeResponse };
