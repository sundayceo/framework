import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

import type { ViteDevServer } from "vite";

import type { AppConfig } from "../runtime/create-app";
import type { GeneratedTemplates, RouteEntry } from "../runtime/create-handler";

type ConnectIncomingMessage = IncomingMessage & { originalUrl?: string };

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
	routes: RouteEntry[];
	templates: GeneratedTemplates;
	errorPages?: Record<number, () => Promise<unknown>>;
	hydrationManifest?: Record<string, Record<string, boolean>>;
}) => { fetch: (request: Request) => Promise<Response> };

type LoadedModules = {
	app: AppConfig;
	routes: RouteEntry[];
	templates: GeneratedTemplates;
	errorPages?: Record<number, () => Promise<unknown>>;
	hydrationManifest?: Record<string, Record<string, boolean>>;
	createHandler: CreateHandlerFn;
};

const PROTOCOL = "http";
const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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
	/* v8 ignore start -- host/url/method are always present in Connect requests */
	const host = req.headers.host ?? "localhost";
	const pathname = req.originalUrl ?? req.url ?? "/";
	const url = `${PROTOCOL}://${host}${pathname}`;
	const method = req.method ?? "GET";
	/* v8 ignore stop */
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

	const buffer = await response.arrayBuffer();
	res.end(Buffer.from(buffer));
}

function isHtmlResponse(response: Response): boolean {
	return (response.headers.get("content-type") ?? "").includes("text/html");
}

function assertFunction(mod: Record<string, unknown>, key: string, label: string): void {
	if (typeof mod[key] !== "function") {
		throw new Error(`${label} must export "${key}" as a function`);
	}
}

function assertArray(mod: Record<string, unknown>, key: string, label: string): void {
	if (!Array.isArray(mod[key])) {
		throw new Error(`${label} must export "${key}" as an array`);
	}
}

function assertObject(mod: Record<string, unknown>, key: string, label: string): void {
	if (typeof mod[key] !== "object" || mod[key] === null) {
		throw new Error(`${label} must export "${key}" as an object`);
	}
}

/* eslint-disable @typescript-eslint/consistent-type-assertions -- ssrLoadModule returns Record<string, unknown>; narrowing to LoadedModules fields */
async function loadModules(server: ViteDevServer, srcDir: string): Promise<LoadedModules> {
	const appModule: Record<string, unknown> = await server.ssrLoadModule(
		path.join(srcDir, "app.ts"),
	);
	const routesModule: Record<string, unknown> = await server.ssrLoadModule(
		path.join(srcDir, "routes.gen.ts"),
	);
	const frameworkModule: Record<string, unknown> =
		await server.ssrLoadModule("@sundayceo/framework");

	const app = appModule.app ?? appModule.default;
	if (typeof app !== "object" || app === null) {
		throw new Error('app.ts must export "app" or a default export as an object');
	}

	assertArray(routesModule, "routes", "routes.gen.ts");
	assertObject(routesModule, "templates", "routes.gen.ts");
	assertFunction(frameworkModule, "createHandler", "@sundayceo/framework");

	return {
		app: app as AppConfig,
		routes: routesModule.routes as RouteEntry[],
		templates: routesModule.templates as GeneratedTemplates,
		errorPages: routesModule.errorPages as LoadedModules["errorPages"],
		hydrationManifest: routesModule.hydrationManifest as LoadedModules["hydrationManifest"],
		createHandler: frameworkModule.createHandler as CreateHandlerFn,
	};
}
/* eslint-enable @typescript-eslint/consistent-type-assertions */

async function dispatchRequest(input: DispatchInput): Promise<void> {
	const { server, srcDir, req, res, next } = input;

	try {
		const request = await toWebRequest(req);
		const { app, routes, templates, errorPages, hydrationManifest, createHandler } =
			await loadModules(server, srcDir);
		const handler = createHandler({ app, routes, templates, errorPages, hydrationManifest });
		const response = await handler.fetch(request);

		if (isHtmlResponse(response)) {
			/* v8 ignore next */
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

/** Creates a Connect middleware that dispatches requests through the framework handler during dev. */
export function createDevMiddleware(input: MiddlewareInput): () => void {
	const middleware = buildMiddleware(input);

	return (): void => {
		input.server.middlewares.use(middleware);
	};
}
