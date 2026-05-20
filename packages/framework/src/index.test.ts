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
	type Context,
	type HandlerModule,
	type PageModule,
	type RouteMap,
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

test("PageModule and HandlerModule are mutually exclusive", () => {
	type Page = PageModule<"default", { id: string }>;
	type Handler = HandlerModule<{ id: string }>;

	expectTypeOf<Page>().not.toExtend<Handler>();
	expectTypeOf<Handler>().not.toExtend<Page>();
});
