import type { AppConfig } from "./create-app";
import type { HandlerModule, PageModule, TemplateComponent } from "./core/index";
import type { RouteEntry } from "./route-scanner";
import { handleRequest } from "./handle-request";
import { matchRoute } from "./route-matcher";
import { renderPage } from "./render-page";
import { resolveErrorPage } from "./resolve-error-page";
import { runLoader } from "./run-loader";
type RequestHandlerOptions = {
	app: AppConfig<Record<string, unknown>>;
	getRoutes: () => RouteEntry[];
	loadRouteModule: (route: RouteEntry) => Promise<PageModule | HandlerModule>;
	loadTemplate: (templateId: string) => Promise<TemplateComponent>;
};

const METHOD_NOT_ALLOWED = 405;
const NOT_FOUND = 404;

function isPageModule(module: PageModule | HandlerModule): module is PageModule {
	return "template" in module;
}

function createRequestHandler(
	options: RequestHandlerOptions,
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

		if (isPageModule(routeModule)) {
			return handleRequest({
				request,
				render: () => {
					const loaderPromise = runLoader({
						pageModule: routeModule,
						params: match.params,
						request,
						appContext,
					});

					return loaderPromise.then(async (loaderData) => {
						const template = await loadTemplate(routeModule.template);
						return renderPage({
							pageModule: routeModule,
							template,
							loaderData,
						});
					}) as unknown as Response;
				},
				onError: app.onError,
			});
		}

		// Handler module
		const method = request.method.toUpperCase() as keyof HandlerModule;
		const methodHandler = routeModule[method];

		if (methodHandler === undefined) {
			return new Response(null, { status: METHOD_NOT_ALLOWED });
		}

		return handleRequest({
			request,
			render: () => {
				const ctx = {
					request,
					params: match.params,
					...appContext,
				};

				return methodHandler(ctx) as Response;
			},
			onError: app.onError,
		});
	};
}

export { createRequestHandler, type RequestHandlerOptions };
