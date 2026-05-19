import { RouteKind, type SlotMap, type TemplateRegistry } from "./types";

/** Context passed to error page loaders, containing status, message, and optional error details. */
export type ErrorContext = {
	status: number;
	message: string;
	stack?: string;
	error?: unknown;
};

type MetaValue<TLoaderData> =
	| { title?: string; description?: string }
	| ((args: { loaderData: TLoaderData }) => {
			title?: string;
			description?: string;
	  });

type ErrorPageConfigWithLoader<TTemplate extends keyof TemplateRegistry, TLoaderData> = {
	template: TTemplate;
	loader: (ctx: { error: ErrorContext }) => TLoaderData | Promise<TLoaderData>;
	defineSlots: (args: { loaderData: Awaited<TLoaderData> }) => SlotMap;
	meta?: MetaValue<Awaited<TLoaderData>>;
};

type ErrorPageConfigWithoutLoader<TTemplate extends keyof TemplateRegistry> = {
	template: TTemplate;
	defineSlots: (args: { loaderData: undefined }) => SlotMap;
	meta?: MetaValue<undefined>;
};

/** Returns a curried function that defines a custom error page for the given HTTP status code. */
export function defineErrorPage(_status: number): {
	<TTemplate extends keyof TemplateRegistry, TLoaderData>(
		config: ErrorPageConfigWithLoader<TTemplate, TLoaderData>,
	): ErrorPageConfigWithLoader<TTemplate, TLoaderData> & { [RouteKind]: "page" };
	<TTemplate extends keyof TemplateRegistry>(
		config: ErrorPageConfigWithoutLoader<TTemplate>,
	): ErrorPageConfigWithoutLoader<TTemplate> & { [RouteKind]: "page" };
} {
	return <T>(config: T): T & { [RouteKind]: "page" } => ({
		...config,
		[RouteKind]: "page" as const,
	});
}
