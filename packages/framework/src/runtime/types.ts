import type { ReactNode } from "react";

/** Unique symbol key used to tag route modules as either "page" or "handler". */
export const RouteKind = Symbol.for("sundayceo.routeKind");
/** Type alias for the RouteKind symbol. */
export type RouteKind = typeof RouteKind;

/** Request context passed to loaders and handlers, including params and custom app context. */
export type Context<
	TParams extends Record<string, string> = Record<string, string>,
	TCustom extends Record<string, unknown> = CustomContext,
> = {
	request: Request;
	params: TParams;
} & TCustom;

/** Map of slot IDs to their React content. */
export type SlotMap = Record<string, ReactNode>;

/** A React component that renders a page layout, receiving head content as a prop. */
export type TemplateComponent = React.FC<{ head: ReactNode }>;

/** Module definition for a page route, including template, loader, slots, and meta. */
export type PageModule<
	TTemplate extends string = string,
	TParams extends Record<string, string> = Record<string, string>,
	TCustom extends Record<string, unknown> = Record<string, unknown>,
	TLoaderData = unknown,
> = {
	[RouteKind]: "page";
	template: TTemplate;
	loader?: (ctx: Context<TParams, TCustom>) => TLoaderData | Promise<TLoaderData>;
	defineSlots: (args: { loaderData: TLoaderData }) => SlotMap;
	meta?:
		| { title?: string; description?: string }
		| ((args: { loaderData: TLoaderData }) => { title?: string; description?: string });
};

type MethodHandler<
	TParams extends Record<string, string>,
	TCustom extends Record<string, unknown>,
> = (ctx: Context<TParams, TCustom>) => Response | Promise<Response>;

/** Module definition for an API handler route with HTTP method handlers. */
export type HandlerModule<
	TParams extends Record<string, string> = Record<string, string>,
	TCustom extends Record<string, unknown> = CustomContext,
> = {
	[RouteKind]: "handler";
	GET?: MethodHandler<TParams, TCustom>;
	POST?: MethodHandler<TParams, TCustom>;
	PUT?: MethodHandler<TParams, TCustom>;
	PATCH?: MethodHandler<TParams, TCustom>;
	DELETE?: MethodHandler<TParams, TCustom>;
};

/** Declaration-merging interface for registering the app's type-safe configuration. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type
export interface Register {}

/** Declaration-merging interface for registering available template names. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type
export interface TemplateRegistry {}

/** Declaration-merging interface for registering route paths and their param types. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type
export interface RouteMap {}

/** Resolves to the registered app type, or undefined if none is registered. */
export type RegisteredApp = Register extends { app: infer T } ? T : undefined;

type InferCustomFromApp<T> = T extends {
	context: (...args: never[]) => infer R;
}
	? Awaited<R>
	: Record<string, unknown>;

/** Inferred custom context type from the registered app, or a generic record. */
export type CustomContext = RegisteredApp extends undefined
	? Record<string, unknown>
	: InferCustomFromApp<RegisteredApp>;

/** A route definition that can be matched against a URL path. */
export type MatchableRoute = {
	routePath: string;
	params: string[];
};
