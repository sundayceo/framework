import type { Context } from "./core/index";

type RunLoaderArgs = {
	pageModule: { loader?: (ctx: Context) => unknown };
	params: Record<string, string>;
	request: Request;
	appContext: Record<string, unknown>;
};

export function runLoader(args: RunLoaderArgs): Promise<unknown> {
	if (!args.pageModule.loader) {
		return Promise.resolve(undefined);
	}

	const ctx: Context = {
		request: args.request,
		params: args.params,
		...args.appContext,
	};

	const { loader } = args.pageModule;

	return new Promise((resolve) => {
		resolve(loader(ctx));
	});
}
