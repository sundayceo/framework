export const VERSION = "0.0.0";

export { createApp } from "./create-app";
export type { AppConfig } from "./create-app";
export { defineHandler } from "./define-handler";
export { definePage } from "./define-page";
export { extractSlots } from "./extract-slots";
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

export { generateTemplateRegistry } from "./codegen-templates";
export { isInteractive } from "./interactivity-inference";
export { matchRoute, type MatchResult } from "./route-matcher";
export { resolveTemplate } from "./template-resolver";
export { scanRoutes, type RouteEntry } from "./route-scanner";
