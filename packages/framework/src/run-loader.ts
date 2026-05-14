import type { Context } from "./core/index";

type RunLoaderArgs = {
	pageModule: { loader?: (ctx: Context) => unknown | Promise<unknown> };
	params: Record<string, string>;
	request: Request;
	appContext: Record<string, unknown>;
};

export async function runLoader(args: RunLoaderArgs): Promise<unknown> {
	if (!args.pageModule.loader) {
		return undefined;
	}

	const ctx: Context = {
		request: args.request,
		params: args.params,
		...args.appContext,
	};

	return args.pageModule.loader(ctx);
}
