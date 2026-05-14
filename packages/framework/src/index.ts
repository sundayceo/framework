export const VERSION = "0.0.0";

export { createApp } from "./create-app";
export type { AppConfig } from "./create-app";
export { defineHandler } from "./define-handler";
export { definePage } from "./define-page";
export { Slot, SlotContext, SlotProvider } from "./slot";

export type {
	Context,
	HandlerModule,
	PageModule,
	RouteMap,
	SlotMap,
	TemplateComponent,
	TemplateRegistry,
} from "./core/index";

export { matchRoute, type MatchResult } from "./route-matcher";
export { scanRoutes, type RouteEntry } from "./route-scanner";
