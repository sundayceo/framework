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

type RouteNamespace = { default: PageModule | HandlerModule };

type GeneratedRoute = {
	pattern: string;
	params: string[];
	load: () => Promise<RouteNamespace>;
};

type GeneratedTemplates = Record<string, () => Promise<{ default: TemplateComponent }>>;

type HandlerOptions<TPlatform = unknown> = {
	app: AppConfig<Record<string, unknown>, TPlatform>;
	routes: GeneratedRoute[];
	templates: GeneratedTemplates;
	errorPages?: GeneratedErrorPages;
	hydrationManifest?: Record<string, Record<string, boolean>>;
	clientAssetMap?: Record<string, Record<string, string>>;
};

const NOT_FOUND = 404;
const METHOD_NOT_ALLOWED = 405;
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

function isHttpMethod(method: string): method is "GET" | "POST" | "PUT" | "PATCH" | "DELETE" {
	return HTTP_METHODS.has(method);
}

function isPageModule(module: PageModule | HandlerModule): module is PageModule {
	return module[RouteKind] === "page";
}

function extractModule(namespace: RouteNamespace): PageModule | HandlerModule {
	return namespace.default;
}

type DispatchInput = Pick<
	HandlerOptions,
	"templates" | "errorPages" | "hydrationManifest" | "clientAssetMap"
> & {
	match: MatchResult<GeneratedRoute>;
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
		clientAssetMap,
	} = input;

	try {
		const loadTemplate = templates[routeModule.template];
		if (loadTemplate === undefined) {
			throw new Error(`Template "${routeModule.template}" not found`);
		}
		const { default: template } = await loadTemplate();
		const routePath = match.route.pattern;
		const slotInteractivity = hydrationManifest?.[routePath];
		const assetPaths = clientAssetMap?.[routePath];

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

function createHandler<TPlatform = unknown>(
	options: HandlerOptions<TPlatform>,
): { fetch: (request: Request, platform?: TPlatform) => Promise<Response> } {
	const { app, routes, templates, errorPages, hydrationManifest, clientAssetMap } = options;

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

			const namespace = await match.route.load();
			const routeModule = extractModule(namespace);
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
				clientAssetMap,
			};

			if (isPageModule(routeModule)) {
				return dispatchPage(routeModule, dispatchInput);
			}

			return dispatchHandler(routeModule, dispatchInput);
		},
	};
}

export {
	createHandler,
	type GeneratedErrorPages,
	type GeneratedRoute,
	type GeneratedTemplates,
	type HandlerOptions,
};
