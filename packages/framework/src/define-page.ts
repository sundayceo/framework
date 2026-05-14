import type { Context, CustomContext, RouteMap, SlotMap, TemplateRegistry } from "./core/index";

type MetaValue<TLoaderData> =
	| { title?: string; description?: string }
	| ((args: { loaderData: TLoaderData }) => {
			title?: string;
			description?: string;
	  });

type PageConfigWithLoader<
	TTemplate extends keyof TemplateRegistry,
	TParams extends Record<string, string>,
	TLoaderData,
> = {
	template: TTemplate;
	loader: (ctx: Context<TParams, CustomContext>) => TLoaderData | Promise<TLoaderData>;
	defineSlots: (args: { loaderData: Awaited<TLoaderData> }) => SlotMap;
	meta?: MetaValue<Awaited<TLoaderData>>;
};

type PageConfigWithoutLoader<TTemplate extends keyof TemplateRegistry> = {
	template: TTemplate;
	defineSlots: (args: { loaderData: undefined }) => SlotMap;
	meta?: MetaValue<undefined>;
};

type InferParams<TPath extends string> = TPath extends keyof RouteMap
	? RouteMap[TPath]
	: Record<string, string>;

export function definePage<TPath extends string>(
	_path: TPath,
): {
	<TTemplate extends keyof TemplateRegistry, TLoaderData>(
		config: PageConfigWithLoader<TTemplate, InferParams<TPath>, TLoaderData>,
	): PageConfigWithLoader<TTemplate, InferParams<TPath>, TLoaderData>;
	<TTemplate extends keyof TemplateRegistry>(
		config: PageConfigWithoutLoader<TTemplate>,
	): PageConfigWithoutLoader<TTemplate>;
} {
	return <T>(config: T): T => config;
}
