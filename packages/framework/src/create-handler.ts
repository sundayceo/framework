import type { Context, HandlerModule, PageModule, TemplateComponent } from "./core/index";
import type { AppConfig } from "./create-app";
import { handleRequest } from "./handle-request";
import { renderPage } from "./render-page";
import { resolveErrorPage } from "./resolve-error-page";
import { matchRoute, type MatchResult } from "./route-matcher";

type PageNamespace = { page: PageModule };
type HandlerNamespace = HandlerModule;
type RouteNamespace = PageNamespace | HandlerNamespace;

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
};

const METHOD_NOT_ALLOWED = 405;
const NOT_FOUND = 404;

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

function isHttpMethod(method: string): method is keyof HandlerModule {
	return HTTP_METHODS.has(method);
}

function isPageNamespace(ns: RouteNamespace): ns is PageNamespace {
	return "page" in ns;
}

function isPageModule(module: PageModule | HandlerModule): module is PageModule {
	return "template" in module;
}

function extractModule(namespace: RouteNamespace): PageModule | HandlerModule {
	if (isPageNamespace(namespace)) {
		return namespace.page;
	}

	return namespace;
}

type DispatchPageInput = {
	routeModule: PageModule;
	templateId: string;
	templates: GeneratedTemplates;
	match: MatchResult<GeneratedRoute>;
	request: Request;
	appContext: Record<string, unknown>;
	onError: AppConfig["onError"];
};

function dispatchPage(input: DispatchPageInput): Promise<Response> {
	const { routeModule, templateId, templates, match, request, appContext, onError } = input;

	return handleRequest({
		request,
		render: async () => {
			const loadTemplate = templates[templateId];

			if (loadTemplate === undefined) {
				throw new Error(`Template "${templateId}" not found`);
			}

			const { default: template } = await loadTemplate();

			return renderPage({
				pageModule: routeModule,
				template,
				request,
				params: match.params,
				appContext,
			});
		},
		onError,
	});
}

type DispatchHandlerInput = {
	routeModule: HandlerModule;
	match: MatchResult<GeneratedRoute>;
	request: Request;
	appContext: Record<string, unknown>;
	onError: AppConfig["onError"];
};

function dispatchHandler(input: DispatchHandlerInput): Promise<Response> {
	const { routeModule, match, request, appContext, onError } = input;
	const method = request.method.toUpperCase();

	if (!isHttpMethod(method)) {
		return Promise.resolve(new Response(null, { status: METHOD_NOT_ALLOWED }));
	}

	const methodHandler = routeModule[method];

	if (methodHandler === undefined) {
		return Promise.resolve(new Response(null, { status: METHOD_NOT_ALLOWED }));
	}

	return handleRequest({
		request,
		render: () => {
			const ctx: Context = {
				request,
				params: match.params,
				...appContext,
			};
			return methodHandler(ctx);
		},
		onError,
	});
}

function createHandler<TPlatform = unknown>(
	options: HandlerOptions<TPlatform>,
): { fetch: (request: Request, platform?: TPlatform) => Promise<Response> } {
	const { app, routes, templates } = options;

	return {
		async fetch(request: Request, platform?: TPlatform): Promise<Response> {
			const url = new URL(request.url);
			const match = matchRoute(url.pathname, routes);

			if (match === null) {
				return resolveErrorPage({ status: NOT_FOUND });
			}

			const namespace = await match.route.load();
			const routeModule = extractModule(namespace);
			const appContext = await app.context(request, platform);
			const { onError } = app;

			if (isPageModule(routeModule)) {
				return dispatchPage({
					routeModule,
					templateId: routeModule.template,
					templates,
					match,
					request,
					appContext,
					onError,
				});
			}

			return dispatchHandler({
				routeModule,
				match,
				request,
				appContext,
				onError,
			});
		},
	};
}

export { createHandler, type GeneratedRoute, type GeneratedTemplates, type HandlerOptions };
