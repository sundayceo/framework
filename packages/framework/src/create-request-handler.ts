import type { Context, HandlerModule, PageModule, TemplateComponent } from "./core/index";
import type { AppConfig } from "./create-app";
import { handleRequest } from "./handle-request";
import { renderPage } from "./render-page";
import { resolveErrorPage } from "./resolve-error-page";
import { matchRoute, type MatchResult } from "./route-matcher";
import type { MatchableRoute } from "./route-scanner";
import { runLoader } from "./run-loader";

type RequestHandlerOptions<T extends MatchableRoute = MatchableRoute> = {
	app: AppConfig;
	getRoutes: () => T[];
	loadRouteModule: (route: T) => Promise<PageModule | HandlerModule>;
	loadTemplate: (templateId: string) => Promise<TemplateComponent>;
};

const METHOD_NOT_ALLOWED = 405;
const NOT_FOUND = 404;

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

function isPageModule(module: PageModule | HandlerModule): module is PageModule {
	return "template" in module;
}

function isHttpMethod(method: string): method is keyof HandlerModule {
	return HTTP_METHODS.has(method);
}

type RouteHandlerInput<T extends MatchableRoute = MatchableRoute> = {
	match: MatchResult<T>;
	request: Request;
	appContext: Record<string, unknown>;
	onError: AppConfig["onError"];
};

function handlePageRoute(
	routeModule: PageModule,
	loadTemplate: (templateId: string) => Promise<TemplateComponent>,
	input: RouteHandlerInput,
): Promise<Response> {
	return handleRequest({
		request: input.request,
		render: async () => {
			const loaderData = await runLoader({
				pageModule: routeModule,
				params: input.match.params,
				request: input.request,
				appContext: input.appContext,
			});
			const template = await loadTemplate(routeModule.template);
			return renderPage({ pageModule: routeModule, template, loaderData });
		},
		onError: input.onError,
	});
}

function handleHandlerRoute(
	routeModule: HandlerModule,
	input: RouteHandlerInput,
): Promise<Response> {
	const method = input.request.method.toUpperCase();

	if (!isHttpMethod(method)) {
		return Promise.resolve(new Response(null, { status: METHOD_NOT_ALLOWED }));
	}

	const methodHandler = routeModule[method];

	if (methodHandler === undefined) {
		return Promise.resolve(new Response(null, { status: METHOD_NOT_ALLOWED }));
	}

	return handleRequest({
		request: input.request,
		render: () => {
			const ctx: Context = {
				request: input.request,
				params: input.match.params,
				...input.appContext,
			};
			return methodHandler(ctx);
		},
		onError: input.onError,
	});
}

function createRequestHandler<T extends MatchableRoute>(
	options: RequestHandlerOptions<T>,
): (request: Request) => Promise<Response> {
	const { app, getRoutes, loadRouteModule, loadTemplate } = options;

	return async (request: Request): Promise<Response> => {
		const url = new URL(request.url);
		const match = matchRoute(url.pathname, getRoutes());

		if (match === null) {
			return resolveErrorPage({ status: NOT_FOUND });
		}

		const routeModule = await loadRouteModule(match.route);
		const appContext = await app.context(request);

		const input: RouteHandlerInput<T> = { match, request, appContext, onError: app.onError };

		if (isPageModule(routeModule)) {
			return handlePageRoute(routeModule, loadTemplate, input);
		}

		return handleHandlerRoute(routeModule, input);
	};
}

export { createRequestHandler, type RequestHandlerOptions };
