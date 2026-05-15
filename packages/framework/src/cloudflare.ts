import { createRequestHandler, type RequestHandlerOptions } from "./create-request-handler";
import type { MatchableRoute } from "./route-scanner";

type ExecutionContext = {
	waitUntil: (promise: Promise<unknown>) => void;
	passThroughOnException: () => void;
};

type CloudflareOptions<TEnv, TMapped extends Record<string, unknown>> = {
	env?: (env: TEnv) => TMapped;
};

type WorkerExportedHandler<TEnv = unknown> = {
	fetch: (request: Request, env: TEnv, ctx: ExecutionContext) => Promise<Response>;
};

function cloudflare<
	TRoute extends MatchableRoute,
	TEnv = unknown,
	TMapped extends Record<string, unknown> = Record<string, unknown>,
>(
	handlerOptions: RequestHandlerOptions<TRoute>,
	options?: CloudflareOptions<TEnv, TMapped>,
): WorkerExportedHandler<TEnv> {
	return {
		fetch(request: Request, env: TEnv, ctx: ExecutionContext): Promise<Response> {
			const envContext = options?.env ? options.env(env) : {};
			const originalApp = handlerOptions.app;
			const wrappedApp = {
				...originalApp,
				context: async (req: Request) => ({
					...(await originalApp.context(req)),
					...envContext,
					cloudflare: { ctx },
				}),
			};
			const handler = createRequestHandler({ ...handlerOptions, app: wrappedApp });
			return handler(request);
		},
	};
}

export { cloudflare, type CloudflareOptions, type ExecutionContext };
