export { createApp } from "./runtime/create-app";
export type { AppConfig } from "./runtime/create-app";
export { createHandler } from "./runtime/create-handler";
export type {
	GeneratedErrorPages,
	RouteEntry,
	GeneratedTemplates,
	HandlerConfig,
} from "./runtime/create-handler";
export { definePage } from "./runtime/define-page";
export { defineHandler } from "./runtime/define-handler";
export { defineErrorPage, type ErrorContext } from "./runtime/define-error-page";
export { Slot, SlotProvider } from "./runtime/slot";
export { httpError, isHttpErrorResponse } from "./runtime/throwable-response";
export { isRedirectResponse, redirect } from "./runtime/throwable-response";
export { viewTransitionName } from "./runtime/view-transition";

export { RouteKind } from "./runtime/types";
export type {
	Context,
	HandlerModule,
	PageModule,
	Register,
	RouteMap,
	SlotMap,
	TemplateComponent,
	TemplateRegistry,
} from "./runtime/types";
