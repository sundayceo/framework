export const VERSION = "0.0.0";

export { createApp } from "./create-app";
export type { AppConfig } from "./create-app";
export { defineHandler } from "./define-handler";
export { defineErrorPage, type ErrorContext } from "./define-error-page";
export { definePage } from "./define-page";
export { Slot, SlotContext, SlotProvider } from "./slot";

export { RouteKind } from "./core/index";
export type {
	Context,
	CustomContext,
	HandlerModule,
	PageModule,
	Register,
	RegisteredApp,
	RouteMap,
	SlotMap,
	TemplateComponent,
	TemplateRegistry,
} from "./core/index";

export { createHandler } from "./create-handler";
export type { GeneratedRoute, GeneratedTemplates, HandlerOptions } from "./create-handler";
export { runCodegen } from "./run-codegen";
export { matchRoute, type MatchResult } from "./route-matcher";
export {
	scanRoutes,
	type ErrorPageEntry,
	type ManifestRouteEntry,
	type MatchableRoute,
	type RouteEntry,
	type ScanResult,
} from "./route-scanner";
export { renderPage } from "./render-page";
export {
	defaultNotFoundPage,
	defaultServerErrorPage,
	resolveErrorPage,
} from "./resolve-error-page";
export {
	HttpErrorResponse,
	RedirectResponse,
	httpError,
	isHttpErrorResponse,
	isRedirectResponse,
	redirect,
} from "./throwable-response";
export { filePathToRoutePath, transformRouteModule } from "./transform-route-module";
export { viewTransitionName } from "./view-transition";
