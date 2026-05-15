import { AsyncLocalStorage } from "node:async_hooks";

type ExecutionContext = {
	waitUntil: (promise: Promise<unknown>) => void;
	passThroughOnException: () => void;
};

type CloudflareContext<TEnv = unknown> = {
	env: TEnv;
	ctx: ExecutionContext;
};

type CloudflareOptions<TEnv, TMapped> = {
	env?: (env: TEnv) => TMapped;
};

type WorkerExportedHandler<TEnv = unknown> = {
	fetch: (request: Request, env: TEnv, ctx: ExecutionContext) => Promise<Response>;
};

const storage = new AsyncLocalStorage<CloudflareContext>();

function narrowContext<T>(store: CloudflareContext): store is CloudflareContext<T> {
	return "env" in store;
}

function cloudflare<TEnv, TMapped extends Record<string, unknown> = Record<string, unknown>>(
	handler: (request: Request) => Promise<Response>,
	options?: CloudflareOptions<TEnv, TMapped>,
): WorkerExportedHandler<TEnv> {
	return {
		fetch(request: Request, env: TEnv, ctx: ExecutionContext): Promise<Response> {
			const mapped: Record<string, unknown> = options?.env ? options.env(env) : {};
			const store: CloudflareContext = { env: mapped, ctx };
			return storage.run(store, () => handler(request));
		},
	};
}

function getCloudflareContext<T = Record<string, unknown>>(): CloudflareContext<T> {
	const store = storage.getStore();
	if (store === undefined || !narrowContext<T>(store)) {
		throw new Error("getCloudflareContext() must be called inside a Cloudflare Workers request");
	}
	return store;
}

export { cloudflare, getCloudflareContext, type CloudflareOptions, type ExecutionContext };
