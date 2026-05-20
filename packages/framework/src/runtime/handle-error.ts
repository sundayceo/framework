import type { AppConfig } from "./create-app";
import type { ErrorContext } from "./define-error-page";
import { renderPage } from "./render-page";
import { defaultNotFoundPage, defaultServerErrorPage } from "./resolve-error-page";
import { isHttpErrorResponse, isRedirectResponse } from "./throwable-response";
import type { SlotMap, TemplateComponent } from "./types";

type MetaInfo = { title?: string; description?: string };
type ErrorPageModule = {
	template: string;
	loader?: (ctx: { error: ErrorContext }) => unknown;
	defineSlots: (args: { loaderData: unknown }) => SlotMap;
	meta?: MetaInfo | ((args: { loaderData: unknown }) => MetaInfo);
};

function isErrorPageModule(mod: unknown): mod is ErrorPageModule {
	return (
		typeof mod === "object" &&
		mod !== null &&
		"template" in mod &&
		"defineSlots" in mod &&
		typeof mod.template === "string" &&
		typeof mod.defineSlots === "function"
	);
}

/** Map of HTTP status codes to their lazy-loading error page module imports. */
export type GeneratedErrorPages = Record<number, () => Promise<{ default: unknown }>>;
type GeneratedTemplates = Record<string, () => Promise<{ default: TemplateComponent }>>;

const NOT_FOUND = 404;
const INTERNAL_SERVER_ERROR = 500;

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

function bareErrorPage(status: number): Response {
	const base = status === NOT_FOUND ? defaultNotFoundPage() : defaultServerErrorPage();
	return new Response(base.body, { status, headers: base.headers });
}

function adaptErrorModule(
	errorModule: ErrorPageModule,
	errorContext: ErrorContext,
): {
	template: string;
	loader: () => unknown;
	defineSlots: (args: { loaderData: unknown }) => SlotMap;
	meta?: ErrorPageModule["meta"];
} {
	return {
		template: errorModule.template,
		defineSlots: errorModule.defineSlots,
		meta: errorModule.meta,
		loader: () => errorModule.loader?.({ error: errorContext }),
	};
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

/** Renders a custom or default error page for the given HTTP status code. */
export async function renderErrorPage(input: {
	status: number;
	error?: unknown;
	errorPages: GeneratedErrorPages | undefined;
	templates: GeneratedTemplates;
	request: Request;
	appContext: Record<string, unknown>;
}): Promise<Response> {
	const { status, error, errorPages, templates, request, appContext } = input;

	const loadErrorPage = errorPages?.[status];
	if (loadErrorPage === undefined) {
		return bareErrorPage(status);
	}

	try {
		const { default: raw } = await loadErrorPage();
		if (!isErrorPageModule(raw)) {
			return bareErrorPage(status);
		}
		const loadTemplate = templates[raw.template];
		if (loadTemplate === undefined) {
			return bareErrorPage(status);
		}

		const { default: template } = await loadTemplate();
		const isDev = process.env.NODE_ENV !== "production";
		const errorContext: ErrorContext = {
			status,
			message: isDev && error instanceof Error ? error.message : statusMessage(status),
			error,
			stack: isDev && error instanceof Error ? error.stack : undefined,
		};
		const adaptedModule = adaptErrorModule(raw, errorContext);

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

/** Handles thrown errors by converting redirects, HTTP errors, and exceptions into responses. */
export async function handleError(input: {
	error: unknown;
	request: Request;
	onError: AppConfig["onError"];
	errorPages: GeneratedErrorPages | undefined;
	templates: Record<string, () => Promise<{ default: TemplateComponent }>>;
	appContext: Record<string, unknown>;
}): Promise<Response> {
	const { error, request, onError, errorPages, templates, appContext } = input;

	if (isRedirectResponse(error)) {
		return error.response;
	}

	const status = isHttpErrorResponse(error) ? error.response.status : INTERNAL_SERVER_ERROR;
	await callOnError(onError, error, request);
	return renderErrorPage({ status, error, errorPages, templates, request, appContext });
}
