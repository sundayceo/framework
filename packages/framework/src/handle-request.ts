import { resolveErrorPage } from "./resolve-error-page";
import { isHttpErrorResponse, isRedirectResponse } from "./throwable-response";

type ErrorPageRenderer = () => Response;

type HandleRequestInput = {
	request: Request;
	render: () => Response | Promise<Response>;
	onError?: (error: unknown, request: Request) => Response | Promise<Response>;
	errorPages?: Record<number, ErrorPageRenderer>;
};

const INTERNAL_SERVER_ERROR = 500;

export function handleRequest(input: HandleRequestInput): Promise<Response> {
	const { request, render, onError, errorPages } = input;

	return new Promise<Response>((resolve) => {
		resolve(render());
	}).catch((error: unknown) => {
		if (isRedirectResponse(error)) {
			return error.response;
		}

		if (isHttpErrorResponse(error)) {
			return resolveErrorPage({ status: error.response.status, errorPages });
		}

		if (onError !== undefined) {
			return onError(error, request);
		}

		return resolveErrorPage({ status: INTERNAL_SERVER_ERROR, errorPages });
	});
}
