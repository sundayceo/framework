import { RouteKind, type HandlerModule, type RouteMap } from "./core/index";

export function defineHandler<TPath extends keyof RouteMap>(_path: TPath) {
	return (config: Omit<HandlerModule<RouteMap[TPath]>, RouteKind>) => ({
		...config,
		[RouteKind]: "handler" as const,
	});
}
