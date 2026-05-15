import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { Readable } from "node:stream";

import type { ViteDevServer } from "vite";

import type { HandlerModule, PageModule, TemplateComponent } from "./core/index";
import type { AppConfig } from "./create-app";
import { createRequestHandler } from "./create-request-handler";
import { scanRoutes, type RouteEntry } from "./route-scanner";

const PROTOCOL = "http";
const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const TSX_EXTENSION = ".tsx";
const NOT_FOUND_STATUS = 404;

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

function toWebRequest(req: IncomingMessage): Request {
	const host = req.headers.host ?? "localhost";
	const url = `${PROTOCOL}://${host}${req.url ?? "/"}`;
	const method = req.method ?? "GET";
	const headers = buildHeaders(req);
	const hasBody = METHODS_WITH_BODY.has(method);

	if (!hasBody) {
		return new Request(url, { method, headers });
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	const body = Readable.toWeb(req) as unknown as ReadableStream;
	// @ts-expect-error duplex is required for streaming bodies but not in RequestInit type
	return new Request(url, { method, headers, body, duplex: "half" });
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
		.filter((f): f is string => typeof f === "string" && f.endsWith(TSX_EXTENSION));

	return scanRoutes(files);
}

type MiddlewareInput = {
	server: ViteDevServer;
	srcDir: string;
};

type SsrLoaderInput = {
	server: ViteDevServer;
	srcDir: string;
};

async function loadAppConfig(input: SsrLoaderInput): Promise<AppConfig<Record<string, unknown>>> {
	const appPath = path.join(input.srcDir, "app.ts");
	const mod = await input.server.ssrLoadModule(appPath);
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	return mod.default as AppConfig<Record<string, unknown>>;
}

function createRouteModuleLoader(
	input: SsrLoaderInput,
): (route: RouteEntry) => Promise<PageModule | HandlerModule> {
	return async (route: RouteEntry): Promise<PageModule | HandlerModule> => {
		const absolutePath = path.join(input.srcDir, "routes", route.filePath);
		const mod = await input.server.ssrLoadModule(absolutePath);
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
		return mod.default as PageModule | HandlerModule;
	};
}

function createTemplateLoader(
	input: SsrLoaderInput,
): (templateId: string) => Promise<TemplateComponent> {
	return async (templateId: string): Promise<TemplateComponent> => {
		const templatePath = path.join(input.srcDir, "templates", `${templateId}.tsx`);
		const mod = await input.server.ssrLoadModule(templatePath);
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
		return mod.default as TemplateComponent;
	};
}

function isDefaultNotFound(response: Response): boolean {
	const contentType = response.headers.get("content-type") ?? "";
	return response.status === NOT_FOUND_STATUS && contentType.includes("text/html");
}

type ConnectMiddleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => void;

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

	return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
		handleMiddlewareRequest({ server, srcDir, routes, req, res, next });
	};
}

type HandleInput = {
	server: ViteDevServer;
	srcDir: string;
	routes: RouteEntry[];
	req: IncomingMessage;
	res: ServerResponse;
	next: () => void;
};

function dispatchRequest(input: HandleInput): Promise<void> {
	const { server, srcDir, routes, req, res, next } = input;

	return loadAppConfig({ server, srcDir })
		.then((app) => {
			const handler = createRequestHandler({
				app,
				getRoutes: () => routes,
				loadRouteModule: createRouteModuleLoader({ server, srcDir }),
				loadTemplate: createTemplateLoader({ server, srcDir }),
			});

			const webRequest = toWebRequest(req);
			return handler(webRequest);
		})
		.then((response) => {
			if (isDefaultNotFound(response)) {
				next();
				return Promise.resolve();
			}
			return writeResponse(res, response);
		})
		.catch(() => {
			next();
		});
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
