import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

import type { ViteDevServer } from "vite";

import type { AppConfig } from "./create-app";
import type { GeneratedRoute, GeneratedTemplates } from "./create-handler";

const PROTOCOL = "http";
const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type ConnectIncomingMessage = IncomingMessage & { originalUrl?: string };

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

function isHtmlResponse(response: Response): boolean {
	return (response.headers.get("content-type") ?? "").includes("text/html");
}

type MiddlewareInput = {
	server: ViteDevServer;
	srcDir: string;
};

type ConnectMiddleware = (
	req: ConnectIncomingMessage,
	res: ServerResponse,
	next: () => void,
) => void;

type DispatchInput = MiddlewareInput & {
	req: ConnectIncomingMessage;
	res: ServerResponse;
	next: () => void;
};

type CreateHandlerFn = (options: {
	app: AppConfig;
	routes: GeneratedRoute[];
	templates: GeneratedTemplates;
}) => { fetch: (request: Request) => Promise<Response> };

type LoadedModules = {
	app: AppConfig;
	routes: GeneratedRoute[];
	templates: GeneratedTemplates;
	createHandler: CreateHandlerFn;
};

/* eslint-disable @typescript-eslint/consistent-type-assertions */
async function loadModules(server: ViteDevServer, srcDir: string): Promise<LoadedModules> {
	const appModule = await server.ssrLoadModule(path.join(srcDir, "app.ts"));
	const routesModule = await server.ssrLoadModule(path.join(srcDir, "routes.gen.ts"));
	const frameworkModule = await server.ssrLoadModule("@sundayceo/framework");

	return {
		app: (appModule.app ?? appModule.default) as AppConfig,
		routes: routesModule.routes as GeneratedRoute[],
		templates: routesModule.templates as GeneratedTemplates,
		createHandler: frameworkModule.createHandler as CreateHandlerFn,
	};
}
/* eslint-enable @typescript-eslint/consistent-type-assertions */

async function dispatchRequest(input: DispatchInput): Promise<void> {
	const { server, srcDir, req, res, next } = input;

	try {
		const request = await toWebRequest(req);
		const { app, routes, templates, createHandler } = await loadModules(server, srcDir);
		const handler = createHandler({ app, routes, templates });
		const response = await handler.fetch(request);

		if (isHtmlResponse(response)) {
			const url = req.originalUrl ?? req.url ?? "/";
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

function buildMiddleware(input: MiddlewareInput): ConnectMiddleware {
	return (req, res, next) => {
		void dispatchRequest({ ...input, req, res, next });
	};
}

function createDevMiddleware(input: MiddlewareInput): () => void {
	const middleware = buildMiddleware(input);

	return (): void => {
		input.server.middlewares.use(middleware);
	};
}

export { createDevMiddleware };
