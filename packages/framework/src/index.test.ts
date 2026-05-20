import type React from "react";
import { expect, expectTypeOf, test } from "vitest";

import {
	createApp,
	createHandler,
	defineErrorPage,
	defineHandler,
	definePage,
	httpError,
	isHttpErrorResponse,
	isRedirectResponse,
	redirect,
	Slot,
	SlotProvider,
	viewTransitionName,
	type AppConfig,
	type Context,
	type ErrorContext,
	type GeneratedErrorPages,
	type GeneratedTemplates,
	type HandlerConfig,
	type HandlerModule,
	type PageModule,
	type Register,
	type RouteEntry,
	type RouteKind,
	type RouteMap,
	type SlotMap,
	type TemplateComponent,
	type TemplateRegistry,
} from "./index";

test("exports runtime functions", () => {
	expect(createApp).toBeTypeOf("function");
	expect(createHandler).toBeTypeOf("function");
	expect(definePage).toBeTypeOf("function");
	expect(defineHandler).toBeTypeOf("function");
	expect(defineErrorPage).toBeTypeOf("function");
	expect(redirect).toBeTypeOf("function");
	expect(httpError).toBeTypeOf("function");
	expect(isRedirectResponse).toBeTypeOf("function");
	expect(isHttpErrorResponse).toBeTypeOf("function");
	expect(viewTransitionName).toBeTypeOf("function");
	expect(Slot).toBeTypeOf("function");
	expect(SlotProvider).toBeTypeOf("function");
});

test("does not export internal pipeline functions", async () => {
	const barrel = await import("./index");
	expect("renderPage" in barrel).toBe(false);
	expect("matchRoute" in barrel).toBe(false);
	expect("codegen" in barrel).toBe(false);
	expect("scanRoutes" in barrel).toBe(false);
	expect("resolveErrorPage" in barrel).toBe(false);
	expect("defaultNotFoundPage" in barrel).toBe(false);
	expect("defaultServerErrorPage" in barrel).toBe(false);
	expect("filePathToRoutePath" in barrel).toBe(false);
	expect("transformRouteModule" in barrel).toBe(false);
	expect("VERSION" in barrel).toBe(false);
});

test("Context merges params with custom context properties", () => {
	type MyContext = Context<{ id: string }, { db: { query: () => void } }>;

	expectTypeOf<MyContext["params"]>().toEqualTypeOf<{ id: string }>();
	expectTypeOf<MyContext["db"]>().toEqualTypeOf<{ query: () => void }>();
	expectTypeOf<MyContext["request"]>().toEqualTypeOf<Request>();
});

declare module "./runtime/types" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TemplateRegistry {
		default: true;
	}
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface RouteMap {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		"/blog/[slug]": { slug: string };
	}
}

test("TemplateRegistry is augmentable via module declaration merging", () => {
	expectTypeOf<TemplateRegistry["default"]>().toEqualTypeOf<true>();
});

test("RouteMap is augmentable via module declaration merging", () => {
	expectTypeOf<RouteMap["/blog/[slug]"]>().toEqualTypeOf<{ slug: string }>();
});

test("SlotMap maps string slot IDs to ReactNode", () => {
	expectTypeOf<SlotMap>().toEqualTypeOf<Record<string, React.ReactNode>>();
});

test("TemplateComponent accepts head prop with ReactNode", () => {
	expectTypeOf<TemplateComponent>().toEqualTypeOf<React.FC<{ head: React.ReactNode }>>();
});

test("PageModule has RouteKind, template, loader, defineSlots, and meta", () => {
	type Page = PageModule<"default", { id: string }, Record<string, unknown>, { title: string }>;

	expectTypeOf<Page[RouteKind]>().toEqualTypeOf<"page">();
	expectTypeOf<Page["template"]>().toEqualTypeOf<"default">();
	expectTypeOf<NonNullable<Page["loader"]>>().toBeFunction();
	expectTypeOf<Page["defineSlots"]>().toBeFunction();
	expectTypeOf<Page["meta"]>().toEqualTypeOf<
		| { title?: string; description?: string }
		| ((args: { loaderData: { title: string } }) => { title?: string; description?: string })
		| undefined
	>();
});

test("HandlerModule has RouteKind and HTTP method handlers", () => {
	type Handler = HandlerModule<{ id: string }>;

	expectTypeOf<Handler[RouteKind]>().toEqualTypeOf<"handler">();
	expectTypeOf<NonNullable<Handler["GET"]>>().toBeFunction();
	expectTypeOf<NonNullable<Handler["POST"]>>().toBeFunction();
	expectTypeOf<NonNullable<Handler["PUT"]>>().toBeFunction();
	expectTypeOf<NonNullable<Handler["PATCH"]>>().toBeFunction();
	expectTypeOf<NonNullable<Handler["DELETE"]>>().toBeFunction();
});

test("AppConfig has context and optional onError", () => {
	expectTypeOf<AppConfig>().toHaveProperty("context");
	expectTypeOf<AppConfig["onError"]>().toEqualTypeOf<
		((error: unknown, request: Request) => void | Promise<void>) | undefined
	>();
});

test("HandlerConfig has app, routes, templates, and optional hydration fields", () => {
	expectTypeOf<HandlerConfig>().toHaveProperty("app");
	expectTypeOf<HandlerConfig>().toHaveProperty("routes");
	expectTypeOf<HandlerConfig>().toHaveProperty("templates");
});

test("RouteEntry has routePath, params, and loadModule", () => {
	expectTypeOf<RouteEntry>().toHaveProperty("routePath");
	expectTypeOf<RouteEntry>().toHaveProperty("params");
	expectTypeOf<RouteEntry>().toHaveProperty("loadModule");
});

test("GeneratedTemplates maps names to lazy import functions", () => {
	expectTypeOf<GeneratedTemplates>().toExtend<
		Record<string, () => Promise<{ default: TemplateComponent }>>
	>();
});

test("GeneratedErrorPages maps status codes to lazy import functions", () => {
	expectTypeOf<GeneratedErrorPages>().toExtend<
		Record<number, () => Promise<{ default: unknown }>>
	>();
});

test("ErrorContext has status, message, and optional stack/error", () => {
	expectTypeOf<ErrorContext["status"]>().toBeNumber();
	expectTypeOf<ErrorContext["message"]>().toBeString();
	expectTypeOf<ErrorContext["stack"]>().toEqualTypeOf<string | undefined>();
	expectTypeOf<ErrorContext["error"]>().toEqualTypeOf<unknown>();
});

test("Register interface exists for declaration merging", () => {
	expectTypeOf<Register>().toBeObject();
});

test("PageModule and HandlerModule are mutually exclusive", () => {
	type Page = PageModule<"default", { id: string }>;
	type Handler = HandlerModule<{ id: string }>;

	expectTypeOf<Page>().not.toExtend<Handler>();
	expectTypeOf<Handler>().not.toExtend<Page>();
});
