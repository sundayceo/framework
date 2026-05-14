import type { CustomContext, HandlerModule, RouteMap } from "./core/index";

export function defineHandler<TPath extends keyof RouteMap>(_path: TPath) {
	return (config: HandlerModule<RouteMap[TPath], CustomContext>) => config;
}
