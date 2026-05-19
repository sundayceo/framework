import type { ReactNode } from "react";

export const RouteKind = Symbol.for("sundayceo.routeKind");
export type RouteKind = typeof RouteKind;

export type Context<
	TParams extends Record<string, string> = Record<string, string>,
	TCustom extends Record<string, unknown> = CustomContext,
> = {
	request: Request;
	params: TParams;
} & TCustom;

export type SlotMap = Record<string, ReactNode>;

export type TemplateComponent = React.FC<{ head: ReactNode }>;

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

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type
export interface Register {}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type
export interface TemplateRegistry {}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type
export interface RouteMap {}

export type RegisteredApp = Register extends { app: infer T } ? T : undefined;

type InferCustomFromApp<T> = T extends {
	context: (...args: never[]) => infer R;
}
	? Awaited<R>
	: Record<string, unknown>;

export type CustomContext = RegisteredApp extends undefined
	? Record<string, unknown>
	: InferCustomFromApp<RegisteredApp>;

export type MatchableRoute = {
	pattern: string;
	params: string[];
};
