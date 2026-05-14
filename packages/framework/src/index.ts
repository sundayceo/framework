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

export { generateRouteMap } from "./codegen-routes";
export { generateTemplateRegistry } from "./codegen-templates";
export { isInteractive } from "./interactivity-inference";
export { matchRoute, type MatchResult } from "./route-matcher";
export { resolveTemplate } from "./template-resolver";
export { runLoader } from "./run-loader";
export { scanRoutes, type RouteEntry } from "./route-scanner";
export {
	HttpErrorResponse,
	RedirectResponse,
	httpError,
	isHttpErrorResponse,
	isRedirectResponse,
	redirect,
} from "./throwable-response";
export { validateSlots, type ValidationResult } from "./validate-slots";
