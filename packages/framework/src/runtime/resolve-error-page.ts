const NOT_FOUND = 404;
const INTERNAL_SERVER_ERROR = 500;

const HTML_CONTENT_TYPE = "text/html;charset=utf-8";

function htmlResponse(input: { title: string; status: number }): Response {
	const { title, status } = input;
	const html = `<!DOCTYPE html><html><head><title>${title}</title></head><body><h1>${title}</h1></body></html>`;
	return new Response(html, {
		status,
		headers: { "content-type": HTML_CONTENT_TYPE },
	});
}

/** Returns a minimal HTML 404 Not Found response. */
export function defaultNotFoundPage(): Response {
	return htmlResponse({ title: "Not Found", status: NOT_FOUND });
}

/** Returns a minimal HTML 500 Internal Server Error response. */
export function defaultServerErrorPage(): Response {
	return htmlResponse({ title: "Internal Server Error", status: INTERNAL_SERVER_ERROR });
}

type ErrorPageRenderer = () => Response;

type ResolveErrorPageInput = {
	status: number;
	errorPages?: Record<number, ErrorPageRenderer>;
};

/** Resolves the appropriate error page response, falling back to built-in defaults. */
export function resolveErrorPage(input: ResolveErrorPageInput): Response {
	const { status, errorPages } = input;

	const customRenderer = errorPages?.[status];
	if (customRenderer !== undefined) {
		return customRenderer();
	}

	if (status === NOT_FOUND) {
		return defaultNotFoundPage();
	}

	return defaultServerErrorPage();
}
