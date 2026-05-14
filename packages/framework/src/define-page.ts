import type { Context, RouteMap, SlotMap, TemplateRegistry } from "./core/index";

type MetaData = { title?: string; description?: string };

type PageConfig<TPath extends keyof RouteMap, TLoaderData> = {
	template: keyof TemplateRegistry;
	loader?: (ctx: Context<RouteMap[TPath]>) => TLoaderData | Promise<TLoaderData>;
	defineSlots: (args: { loaderData: TLoaderData }) => SlotMap;
	meta?: MetaData | ((args: { loaderData: TLoaderData }) => MetaData);
};

export function definePage<TPath extends keyof RouteMap>(
	_path: TPath,
): <TLoaderData = undefined>(
	config: PageConfig<TPath, TLoaderData>,
) => PageConfig<TPath, TLoaderData> {
	return (config) => config;
}
