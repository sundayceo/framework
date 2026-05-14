import { isHttpErrorResponse, isRedirectResponse } from "./throwable-response";

type HandleRequestInput = {
	request: Request;
	render: () => Response;
	onError?: (error: unknown, request: Request) => Response | Promise<Response>;
};

const INTERNAL_SERVER_ERROR = 500;

export function handleRequest(input: HandleRequestInput): Promise<Response> {
	const { request, render, onError } = input;

	return new Promise<Response>((resolve) => {
		resolve(render());
	}).catch((error: unknown) => {
		if (isRedirectResponse(error)) {
			return error.response;
		}

		if (isHttpErrorResponse(error)) {
			return error.response;
		}

		if (onError !== undefined) {
			return onError(error, request);
		}

		return new Response("Internal Server Error", { status: INTERNAL_SERVER_ERROR });
	});
}
