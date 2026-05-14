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

export { generateHydrationScript } from "./generate-hydration-script";
export { handleRequest } from "./handle-request";
export { generateRouteMap } from "./codegen-routes";
export { generateTemplateRegistry } from "./codegen-templates";
export { generateDeclarations } from "./generate-declarations";
export { injectHydration } from "./inject-hydration";
export { isInteractive } from "./interactivity-inference";
export { matchRoute, type MatchResult } from "./route-matcher";
export { resolveTemplate } from "./template-resolver";
export { runLoader } from "./run-loader";
export { scanRoutes, type RouteEntry } from "./route-scanner";
export { renderMeta } from "./render-meta";
export { renderPage } from "./render-page";
export { resolveMeta } from "./resolve-meta";
export {
	HttpErrorResponse,
	RedirectResponse,
	httpError,
	isHttpErrorResponse,
	isRedirectResponse,
	redirect,
} from "./throwable-response";
export { filePathToRoutePath, transformRouteModule } from "./transform-route-module";
export { validateSlots, type ValidationResult } from "./validate-slots";
export { viewTransitionName } from "./view-transition";
