import type { AppConfig } from "./create-app";
import { handleError, renderErrorPage, type GeneratedErrorPages } from "./handle-error";
import { renderPage } from "./render-page";
import { matchRoute, type MatchResult } from "./route-matcher";
import {
	RouteKind,
	type Context,
	type HandlerModule,
	type PageModule,
	type TemplateComponent,
} from "./types";

/** A lazily-loadable route definition with its path pattern and parameter names. */
export type RouteEntry = {
	routePath: string;
	params: string[];
	loadModule: () => Promise<{ default: unknown }>;
};

/** Map of template names to their lazy-loading import functions. */
export type GeneratedTemplates = Record<string, () => Promise<{ default: TemplateComponent }>>;

/** Full configuration for the request handler, including routes, templates, and error pages. */
export type HandlerConfig<TPlatform = unknown> = {
	app: AppConfig<Record<string, unknown>, TPlatform>;
	routes: RouteEntry[];
	templates: GeneratedTemplates;
	errorPages?: GeneratedErrorPages;
	hydrationManifest?: Record<string, Record<string, boolean>>;
	hydrationAssets?: Record<string, Record<string, string>>;
};

type DispatchInput = Pick<
	HandlerConfig,
	"templates" | "errorPages" | "hydrationManifest" | "hydrationAssets"
> & {
	match: MatchResult<RouteEntry>;
	request: Request;
	appContext: Record<string, unknown>;
	onError: AppConfig["onError"];
};

const NOT_FOUND = 404;
const METHOD_NOT_ALLOWED = 405;
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

function isHttpMethod(
	method: string,
): method is "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" {
	return HTTP_METHODS.has(method);
}

function hasRouteKind(mod: unknown): mod is { [RouteKind]: string } {
	return typeof mod === "object" && mod !== null && RouteKind in mod;
}

function isPageModule(mod: unknown): mod is PageModule {
	return hasRouteKind(mod) && mod[RouteKind] === "page";
}

function isHandlerModule(mod: unknown): mod is HandlerModule {
	return hasRouteKind(mod) && mod[RouteKind] === "handler";
}

const PAGE_ALLOWED = "GET, HEAD, OPTIONS";

function checkPageMethod(method: string): Response | null {
	if (method === "OPTIONS") {
		return new Response(null, { headers: { allow: PAGE_ALLOWED } });
	}
	if (method !== "GET" && method !== "HEAD") {
		return new Response(null, { status: METHOD_NOT_ALLOWED, headers: { allow: PAGE_ALLOWED } });
	}
	return null;
}

async function dispatchPage(routeModule: PageModule, input: DispatchInput): Promise<Response> {
	const {
		templates,
		match,
		request,
		appContext,
		onError,
		errorPages,
		hydrationManifest,
		hydrationAssets,
	} = input;
	const method = request.method.toUpperCase();

	const methodCheck = checkPageMethod(method);
	if (methodCheck !== null) {
		return methodCheck;
	}

	try {
		const loadTemplate = templates[routeModule.template];
		if (loadTemplate === undefined) {
			const available = Object.keys(templates)
				.map((t) => `"${t}"`)
				.join(", ");
			throw new Error(
				`Template "${routeModule.template}" not found. Available templates: ${available}`,
			);
		}
		const { default: template } = await loadTemplate();
		const { routePath } = match.route;
		const slotInteractivity = hydrationManifest?.[routePath];
		const assetPaths = hydrationAssets?.[routePath];

		const response = await renderPage({
			pageModule: routeModule,
			template,
			request,
			params: match.params,
			appContext,
			slotInteractivity,
			assetPaths,
			routePath,
		});

		if (method === "HEAD") {
			return new Response(null, { status: response.status, headers: response.headers });
		}

		return response;
	} catch (error) {
		return handleError({ error, request, onError, errorPages, templates, appContext });
	}
}

function getAllowedMethods(routeModule: HandlerModule): string[] {
	const methods = (["GET", "POST", "PUT", "PATCH", "DELETE"] as const).filter(
		(m) => routeModule[m] !== undefined,
	);
	if (routeModule.GET !== undefined) {
		return [...methods, "HEAD", "OPTIONS"];
	}
	return [...methods, "OPTIONS"];
}

async function dispatchHandler(
	routeModule: HandlerModule,
	input: DispatchInput,
): Promise<Response> {
	const { match, request, appContext, onError, errorPages, templates } = input;
	const method = request.method.toUpperCase();

	if (!isHttpMethod(method)) {
		return new Response(null, { status: METHOD_NOT_ALLOWED });
	}

	if (method === "OPTIONS") {
		const allowed = getAllowedMethods(routeModule);
		return new Response(null, { headers: { allow: allowed.join(", ") } });
	}

	const resolvedMethod = method === "HEAD" ? "GET" : method;
	const methodHandler = routeModule[resolvedMethod];
	if (methodHandler === undefined) {
		const allowed = getAllowedMethods(routeModule);
		return new Response(null, {
			status: METHOD_NOT_ALLOWED,
			headers: { allow: allowed.join(", ") },
		});
	}

	try {
		const ctx: Context = { request, params: match.params, ...appContext };
		const response = await Promise.resolve(methodHandler(ctx));

		if (method === "HEAD") {
			return new Response(null, { status: response.status, headers: response.headers });
		}

		return response;
	} catch (error) {
		return handleError({ error, request, onError, errorPages, templates, appContext });
	}
}

async function dispatchRoute<TPlatform>(input: {
	match: MatchResult<RouteEntry>;
	app: AppConfig<Record<string, unknown>, TPlatform>;
	request: Request;
	platform: TPlatform | undefined;
	templates: GeneratedTemplates;
	errorPages?: GeneratedErrorPages;
	hydrationManifest?: Record<string, Record<string, boolean>>;
	hydrationAssets?: Record<string, Record<string, string>>;
}): Promise<Response> {
	const {
		match,
		app,
		request,
		platform,
		templates,
		errorPages,
		hydrationManifest,
		hydrationAssets,
	} = input;

	const namespace = await match.route.loadModule();
	const mod = namespace.default;

	const appContext = await app.context(request, platform);
	const { onError } = app;

	const dispatchInput: DispatchInput = {
		templates,
		match,
		request,
		appContext,
		onError,
		errorPages,
		hydrationManifest,
		hydrationAssets,
	};

	if (isPageModule(mod)) {
		return dispatchPage(mod, dispatchInput);
	}

	if (isHandlerModule(mod)) {
		return dispatchHandler(mod, dispatchInput);
	}

	throw new Error(
		`Invalid route module for "${match.route.routePath}". ` +
			`Expected a page (definePage) or handler (defineHandler) default export.`,
	);
}

/** Creates a fetch-compatible request handler that routes requests to pages and API handlers. */
export function createHandler<TPlatform = unknown>(
	options: HandlerConfig<TPlatform>,
): { fetch: (request: Request, platform?: TPlatform) => Promise<Response> } {
	const { app, routes, templates, errorPages, hydrationManifest, hydrationAssets } = options;

	return {
		async fetch(request: Request, platform?: TPlatform): Promise<Response> {
			const url = new URL(request.url);

			const match = matchRoute(url.pathname, routes);
			if (match === null) {
				const appContext = await Promise.resolve(app.context(request, platform)).catch(
					(): Record<string, unknown> => ({}),
				);
				return renderErrorPage({ status: NOT_FOUND, errorPages, templates, request, appContext });
			}

			try {
				return await dispatchRoute({
					match,
					app,
					request,
					platform,
					templates,
					errorPages,
					hydrationManifest,
					hydrationAssets,
				});
			} catch (error) {
				const appContext = await Promise.resolve(app.context(request, platform)).catch(
					(): Record<string, unknown> => ({}),
				);
				return handleError({
					error,
					request,
					onError: app.onError,
					errorPages,
					templates,
					appContext,
				});
			}
		},
	};
}
