import type { SlotMap, TemplateComponent } from "./core/index";
import type { AppConfig } from "./create-app";
import type { ErrorContext } from "./define-error-page";
import { renderPage } from "./render-page";
import { defaultNotFoundPage, defaultServerErrorPage } from "./resolve-error-page";
import { isHttpErrorResponse, isRedirectResponse } from "./throwable-response";

type MetaInfo = { title?: string; description?: string };
type ErrorPageModule = {
	template: string;
	loader?: (ctx: { error: ErrorContext }) => unknown;
	defineSlots: (args: { loaderData: unknown }) => SlotMap;
	meta?: MetaInfo | ((args: { loaderData: unknown }) => MetaInfo);
};

export type GeneratedErrorPages = Record<number, () => Promise<{ default: ErrorPageModule }>>;
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
	return status === NOT_FOUND ? defaultNotFoundPage() : defaultServerErrorPage();
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
		const { default: errorModule } = await loadErrorPage();
		const loadTemplate = templates[errorModule.template];
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
