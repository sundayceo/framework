import type { Context, HandlerModule, PageModule, SlotMap, TemplateComponent } from "./core/index";
import type { AppConfig } from "./create-app";
import type { ErrorContext } from "./define-error-page";
import { renderPage } from "./render-page";
import { defaultNotFoundPage, defaultServerErrorPage } from "./resolve-error-page";
import { matchRoute, type MatchResult } from "./route-matcher";
import { isHttpErrorResponse, isRedirectResponse } from "./throwable-response";

type PageNamespace = { page: PageModule };
type HandlerNamespace = HandlerModule;
type RouteNamespace = PageNamespace | HandlerNamespace;

type ErrorPageModule = {
	template: string;
	loader?: (ctx: { error: ErrorContext }) => unknown;
	defineSlots: (args: { loaderData: unknown }) => SlotMap;
	meta?: { title?: string; description?: string } | ((args: { loaderData: unknown }) => { title?: string; description?: string });
};

type GeneratedErrorPages = Record<number, () => Promise<{ page: ErrorPageModule }>>;

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
};

const METHOD_NOT_ALLOWED = 405;
const NOT_FOUND = 404;
const INTERNAL_SERVER_ERROR = 500;

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

const STATUS_MESSAGES: Record<number, string> = {
	400: "Bad Request",
	401: "Unauthorized",
	403: "Forbidden",
	404: "Not Found",
	405: "Method Not Allowed",
	500: "Internal Server Error",
};

function statusMessage(status: number): string {
	return STATUS_MESSAGES[status] ?? "Internal Server Error";
}

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
	return isPageNamespace(namespace) ? namespace.page : namespace;
}

function bareErrorPage(status: number): Response {
	return status === NOT_FOUND ? defaultNotFoundPage() : defaultServerErrorPage();
}

type AdaptedErrorModule = {
	template: string;
	loader: () => unknown;
	defineSlots: (args: { loaderData: unknown }) => SlotMap;
	meta?: ErrorPageModule["meta"];
};

function adaptErrorModule(errorModule: ErrorPageModule, errorContext: ErrorContext): AdaptedErrorModule {
	return {
		template: errorModule.template,
		defineSlots: errorModule.defineSlots,
		meta: errorModule.meta,
		loader: () => errorModule.loader?.({ error: errorContext }),
	};
}

async function renderErrorPage(input: {
	status: number;
	errorPages: GeneratedErrorPages | undefined;
	templates: GeneratedTemplates;
	request: Request;
	appContext: Record<string, unknown>;
}): Promise<Response> {
	const { status, errorPages, templates, request, appContext } = input;

	const loadErrorPage = errorPages?.[status];
	if (loadErrorPage === undefined) {
		return bareErrorPage(status);
	}

	try {
		const { page: errorModule } = await loadErrorPage();
		const loadTemplate = templates[errorModule.template];
		if (loadTemplate === undefined) {
			return bareErrorPage(status);
		}

		const { default: template } = await loadTemplate();
		const errorContext: ErrorContext = { status, message: statusMessage(status) };
		const adaptedModule = adaptErrorModule(errorModule, errorContext);

		const response = await renderPage({
			pageModule: adaptedModule,
			template,
			request,
			params: {},
			appContext,
		});

		return new Response(response.body, { status, headers: response.headers });
	} catch {
		return bareErrorPage(status);
	}
}

async function callOnError(
	onError: AppConfig["onError"],
	error: unknown,
	request: Request,
): Promise<void> {
	if (onError === undefined) {
		return;
	}
	try {
		await onError(error, request);
	} catch (onErrorError) {
		// eslint-disable-next-line no-console
		console.error("onError hook failed:", onErrorError);
	}
}

async function handleError(input: {
	error: unknown;
	request: Request;
	onError: AppConfig["onError"];
	errorPages: GeneratedErrorPages | undefined;
	templates: GeneratedTemplates;
	appContext: Record<string, unknown>;
}): Promise<Response> {
	const { error, request, onError, errorPages, templates, appContext } = input;

	if (isRedirectResponse(error)) {
		return error.response;
	}

	const status = isHttpErrorResponse(error) ? error.response.status : INTERNAL_SERVER_ERROR;
	await callOnError(onError, error, request);
	return renderErrorPage({ status, errorPages, templates, request, appContext });
}

type DispatchInput = {
	templates: GeneratedTemplates;
	match: MatchResult<GeneratedRoute>;
	request: Request;
	appContext: Record<string, unknown>;
	onError: AppConfig["onError"];
	errorPages?: GeneratedErrorPages;
};

async function dispatchPage(routeModule: PageModule, input: DispatchInput): Promise<Response> {
	const { templates, match, request, appContext, onError, errorPages } = input;

	try {
		const loadTemplate = templates[routeModule.template];
		if (loadTemplate === undefined) {
			throw new Error(`Template "${routeModule.template}" not found`);
		}
		const { default: template } = await loadTemplate();
		return await renderPage({ pageModule: routeModule, template, request, params: match.params, appContext });
	} catch (error) {
		return handleError({ error, request, onError, errorPages, templates, appContext });
	}
}

async function dispatchHandler(routeModule: HandlerModule, input: DispatchInput): Promise<Response> {
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
	const { app, routes, templates, errorPages } = options;

	return {
		async fetch(request: Request, platform?: TPlatform): Promise<Response> {
			const url = new URL(request.url);
			const match = matchRoute(url.pathname, routes);

			if (match === null) {
				const appContext = await Promise.resolve(app.context(request)).catch((): Record<string, unknown> => ({}));
				return renderErrorPage({ status: NOT_FOUND, errorPages, templates, request, appContext });
			}

			const namespace = await match.route.load();
			const routeModule = extractModule(namespace);
			const appContext = await app.context(request, platform);
			const { onError } = app;
			const dispatchInput: DispatchInput = { templates, match, request, appContext, onError, errorPages };

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
