import type { SlotMap, TemplateRegistry } from "./core/index";

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

export function defineErrorPage(_status: number): {
	<TTemplate extends keyof TemplateRegistry, TLoaderData>(
		config: ErrorPageConfigWithLoader<TTemplate, TLoaderData>,
	): ErrorPageConfigWithLoader<TTemplate, TLoaderData>;
	<TTemplate extends keyof TemplateRegistry>(
		config: ErrorPageConfigWithoutLoader<TTemplate>,
	): ErrorPageConfigWithoutLoader<TTemplate>;
} {
	return <T>(config: T): T => config;
}
