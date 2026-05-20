import {
	RouteKind,
	type Context,
	type MetaInfo,
	type RouteMap,
	type SlotMap,
	type TemplateRegistry,
} from "./types";

type MetaValue<TLoaderData> = MetaInfo | ((args: { loaderData: TLoaderData }) => MetaInfo);

type PageConfigWithLoader<
	TTemplate extends keyof TemplateRegistry,
	TParams extends Record<string, string>,
	TLoaderData,
> = {
	template: TTemplate;
	loader: (ctx: Context<TParams>) => TLoaderData | Promise<TLoaderData>;
	defineSlots: (args: { loaderData: Awaited<TLoaderData> }) => SlotMap;
	meta?: MetaValue<Awaited<TLoaderData>>;
};

type PageConfigWithoutLoader<TTemplate extends keyof TemplateRegistry> = {
	template: TTemplate;
	defineSlots: () => SlotMap;
	meta?: MetaInfo;
};

type InferParams<TPath extends string> = TPath extends keyof RouteMap
	? RouteMap[TPath]
	: Record<string, string>;

/** Returns a curried function that defines a type-safe page module for the given route path. */
export function definePage<TPath extends string>(
	_path: TPath,
): {
	<TTemplate extends keyof TemplateRegistry, TLoaderData>(
		config: PageConfigWithLoader<TTemplate, InferParams<TPath>, TLoaderData>,
	): PageConfigWithLoader<TTemplate, InferParams<TPath>, TLoaderData> & {
		[RouteKind]: "page";
	};
	<TTemplate extends keyof TemplateRegistry>(
		config: PageConfigWithoutLoader<TTemplate>,
	): PageConfigWithoutLoader<TTemplate> & { [RouteKind]: "page" };
} {
	return <T>(config: T): T & { [RouteKind]: "page" } => ({
		...config,
		[RouteKind]: "page" as const,
	});
}
