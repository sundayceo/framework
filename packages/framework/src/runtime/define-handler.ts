import { RouteKind, type HandlerModule, type RouteMap } from "./types";

/** Returns a curried function that defines a type-safe API handler for the given route path. */
export function defineHandler<TPath extends keyof RouteMap>(_path: TPath) {
	return (config: Omit<HandlerModule<RouteMap[TPath]>, RouteKind>) => ({
		...config,
		[RouteKind]: "handler" as const,
	});
}
