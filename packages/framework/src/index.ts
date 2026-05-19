export { createApp } from "./runtime/create-app";
export type { AppConfig } from "./runtime/create-app";
export { createHandler } from "./runtime/create-handler";
export type {
	GeneratedErrorPages,
	GeneratedRoute,
	GeneratedTemplates,
	HandlerOptions,
} from "./runtime/create-handler";
export { definePage } from "./runtime/define-page";
export { defineHandler } from "./runtime/define-handler";
export { defineErrorPage, type ErrorContext } from "./runtime/define-error-page";
export { Slot, SlotContext, SlotProvider } from "./runtime/slot";
export { HttpErrorResponse, httpError, isHttpErrorResponse } from "./runtime/throwable-response";
export { RedirectResponse, isRedirectResponse, redirect } from "./runtime/throwable-response";
export { viewTransitionName } from "./runtime/view-transition";

export { RouteKind } from "./runtime/types";
export type {
	Context,
	HandlerModule,
	MatchableRoute,
	PageModule,
	Register,
	RouteMap,
	SlotMap,
	TemplateComponent,
	TemplateRegistry,
} from "./runtime/types";
