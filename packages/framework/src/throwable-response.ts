const DEFAULT_REDIRECT_STATUS = 302;

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

export class HttpErrorResponse extends Error {
	public readonly response: Response;

	public constructor(status: number, message?: string) {
		super(message ?? `HTTP Error ${status}`);
		this.name = "HttpErrorResponse";
		this.response = new Response(message ?? null, { status });
	}
}

export function redirect(url: string, status?: number): never {
	throw new RedirectResponse(url, status);
}

export function httpError(status: number, message?: string): never {
	throw new HttpErrorResponse(status, message);
}

export function isRedirectResponse(error: unknown): error is RedirectResponse {
	return error instanceof RedirectResponse;
}

export function isHttpErrorResponse(error: unknown): error is HttpErrorResponse {
	return error instanceof HttpErrorResponse;
}
