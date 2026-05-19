const DEFAULT_REDIRECT_STATUS = 302;

/** Throwable error that represents an HTTP redirect response. */
export class RedirectResponse extends Error {
	public readonly response: Response;

	public constructor(url: string, status: number = DEFAULT_REDIRECT_STATUS) {
		super(`Redirect to ${url}`);
		this.name = "RedirectResponse";
		this.response = new Response(null, {
			status,
			headers: { location: url },
		});
	}
}

/** Throwable error that represents an HTTP error response with a status code. */
export class HttpErrorResponse extends Error {
	public readonly response: Response;

	public constructor(status: number, message?: string) {
		super(message ?? `HTTP Error ${status}`);
		this.name = "HttpErrorResponse";
		this.response = new Response(message ?? null, { status });
	}
}

/** Throws a RedirectResponse to interrupt request handling and redirect the client. */
export function redirect(url: string, status?: number): never {
	throw new RedirectResponse(url, status);
}

/** Throws an HttpErrorResponse to interrupt request handling with an HTTP error status. */
export function httpError(status: number, message?: string): never {
	throw new HttpErrorResponse(status, message);
}

/** Type guard that checks whether an error is a RedirectResponse. */
export function isRedirectResponse(error: unknown): error is RedirectResponse {
	return error instanceof RedirectResponse;
}

/** Type guard that checks whether an error is an HttpErrorResponse. */
export function isHttpErrorResponse(error: unknown): error is HttpErrorResponse {
	return error instanceof HttpErrorResponse;
}
