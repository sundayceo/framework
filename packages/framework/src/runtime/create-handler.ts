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

const NOT_FOUND = 404;
const METHOD_NOT_ALLOWED = 405;
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

function isHttpMethod(method: string): method is "GET" | "POST" | "PUT" | "PATCH" | "DELETE" {
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

type DispatchInput = Pick<
	HandlerConfig,
	"templates" | "errorPages" | "hydrationManifest" | "hydrationAssets"
> & {
	match: MatchResult<RouteEntry>;
	request: Request;
	appContext: Record<string, unknown>;
	onError: AppConfig["onError"];
};

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

	try {
		const loadTemplate = templates[routeModule.template];
		if (loadTemplate === undefined) {
			throw new Error(`Template "${routeModule.template}" not found`);
		}
		const { default: template } = await loadTemplate();
		const { routePath } = match.route;
		const slotInteractivity = hydrationManifest?.[routePath];
		const assetPaths = hydrationAssets?.[routePath];

		return await renderPage({
			pageModule: routeModule,
			template,
			request,
			params: match.params,
			appContext,
			slotInteractivity,
			assetPaths,
			routePath,
		});
	} catch (error) {
		return handleError({ error, request, onError, errorPages, templates, appContext });
	}
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

	const methodHandler = routeModule[method];
	if (methodHandler === undefined) {
		return new Response(null, { status: METHOD_NOT_ALLOWED });
	}

	try {
		const ctx: Context = { request, params: match.params, ...appContext };
		return await Promise.resolve(methodHandler(ctx));
	} catch (error) {
		return handleError({ error, request, onError, errorPages, templates, appContext });
	}
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
				const appContext = await Promise.resolve(app.context(request)).catch(
					(): Record<string, unknown> => ({}),
				);
				return renderErrorPage({ status: NOT_FOUND, errorPages, templates, request, appContext });
			}

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

			throw new Error(`Invalid route module for ${match.route.routePath}`);
		},
	};
}

export type { GeneratedErrorPages } from "./handle-error";
