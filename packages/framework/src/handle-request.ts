import { resolveErrorPage } from "./resolve-error-page";
import { isHttpErrorResponse, isRedirectResponse } from "./throwable-response";

type ErrorPageRenderer = () => Response;

type HandleRequestInput = {
	request: Request;
	render: () => Response | Promise<Response>;
	onError?: (error: unknown, request: Request) => void | Promise<void>;
	errorPages?: Record<number, ErrorPageRenderer>;
};

const INTERNAL_SERVER_ERROR = 500;

export function handleRequest(input: HandleRequestInput): Promise<Response> {
	const { request, render, onError, errorPages } = input;

	return new Promise<Response>((resolve) => {
		resolve(render());
	}).catch(async (error: unknown) => {
		if (isRedirectResponse(error)) {
			return error.response;
		}

		if (isHttpErrorResponse(error)) {
			return resolveErrorPage({ status: error.response.status, errorPages });
		}

		if (onError !== undefined) {
			try {
				await onError(error, request);
			} catch (onErrorError) {
				// eslint-disable-next-line no-console
				console.error("onError hook failed:", onErrorError);
			}
		}

		return resolveErrorPage({ status: INTERNAL_SERVER_ERROR, errorPages });
	});
}
