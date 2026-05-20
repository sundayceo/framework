import { RouteKind, type HandlerModule, type RouteMap } from "./types";

type InferParams<TPath extends string> = TPath extends keyof RouteMap
	? RouteMap[TPath]
	: Record<string, string>;

/** Returns a curried function that defines a type-safe API handler for the given route path. */
export function defineHandler<TPath extends string>(_path: TPath) {
	return (config: Omit<HandlerModule<InferParams<TPath>>, RouteKind>) => ({
		...config,
		[RouteKind]: "handler" as const,
	});
}
