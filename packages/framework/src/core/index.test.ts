import { expectTypeOf, test } from "vitest";

import type React from "react";

import type {
	Context,
	HandlerModule,
	PageModule,
	RouteMap,
	SlotMap,
	TemplateComponent,
	TemplateRegistry,
} from "./index.ts";

test("Context merges params with custom context properties", () => {
	type MyContext = Context<{ id: string }, { db: { query: () => void } }>;

	expectTypeOf<MyContext["params"]>().toEqualTypeOf<{ id: string }>();
	expectTypeOf<MyContext["db"]>().toEqualTypeOf<{ query: () => void }>();
	expectTypeOf<MyContext["request"]>().toEqualTypeOf<Request>();
});

declare module "./index" {
	interface TemplateRegistry {
		default: true;
	}
	interface RouteMap {
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
	expectTypeOf<TemplateComponent>().toEqualTypeOf<
		React.FC<{ head: React.ReactNode }>
	>();
});

test("PageModule has template, loader, defineSlots, and meta", () => {
	type Page = PageModule<
		"default",
		{ id: string },
		Record<string, unknown>,
		{ title: string }
	>;

	expectTypeOf<Page["template"]>().toEqualTypeOf<"default">();
	expectTypeOf<Page["loader"]>().toBeFunction();
	expectTypeOf<Page["defineSlots"]>().toBeFunction();
	expectTypeOf<Page["meta"]>().toEqualTypeOf<
		{ title?: string; description?: string } | ((args: { loaderData: { title: string } }) => { title?: string; description?: string }) | undefined
	>();
});

test("HandlerModule has HTTP method handlers", () => {
	type Handler = HandlerModule<{ id: string }, Record<string, unknown>>;

	expectTypeOf<NonNullable<Handler["GET"]>>().toBeFunction();
	expectTypeOf<NonNullable<Handler["POST"]>>().toBeFunction();
	expectTypeOf<NonNullable<Handler["PUT"]>>().toBeFunction();
	expectTypeOf<NonNullable<Handler["PATCH"]>>().toBeFunction();
	expectTypeOf<NonNullable<Handler["DELETE"]>>().toBeFunction();
});

test("PageModule and HandlerModule are mutually exclusive", () => {
	type Page = PageModule<"default", { id: string }>;
	type Handler = HandlerModule<{ id: string }>;

	expectTypeOf<Page>().not.toMatchTypeOf<Handler>();
	expectTypeOf<Handler>().not.toMatchTypeOf<Page>();
});
