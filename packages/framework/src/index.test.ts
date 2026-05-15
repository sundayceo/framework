import type React from "react";
import { expect, expectTypeOf, test } from "vitest";

import {
	VERSION,
	type Context,
	type HandlerModule,
	type PageModule,
	type RouteMap,
	type SlotMap,
	type TemplateComponent,
	type TemplateRegistry,
} from "./index";

test("exports a version string", () => {
	expect(VERSION).toBe("0.0.0");
});

test("Context merges params with custom context properties", () => {
	type MyContext = Context<{ id: string }, { db: { query: () => void } }>;

	expectTypeOf<MyContext["params"]>().toEqualTypeOf<{ id: string }>();
	expectTypeOf<MyContext["db"]>().toEqualTypeOf<{ query: () => void }>();
	expectTypeOf<MyContext["request"]>().toEqualTypeOf<Request>();
});

declare module "./index" {
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

test("PageModule has template, loader, defineSlots, and meta", () => {
	type Page = PageModule<"default", { id: string }, Record<string, unknown>, { title: string }>;

	expectTypeOf<Page["template"]>().toEqualTypeOf<"default">();
	expectTypeOf<NonNullable<Page["loader"]>>().toBeFunction();
	expectTypeOf<Page["defineSlots"]>().toBeFunction();
	expectTypeOf<Page["meta"]>().toEqualTypeOf<
		| { title?: string; description?: string }
		| ((args: { loaderData: { title: string } }) => { title?: string; description?: string })
		| undefined
	>();
});

test("HandlerModule has HTTP method handlers", () => {
	type Handler = HandlerModule<{ id: string }>;

	expectTypeOf<NonNullable<Handler["GET"]>>().toBeFunction();
	expectTypeOf<NonNullable<Handler["POST"]>>().toBeFunction();
	expectTypeOf<NonNullable<Handler["PUT"]>>().toBeFunction();
	expectTypeOf<NonNullable<Handler["PATCH"]>>().toBeFunction();
	expectTypeOf<NonNullable<Handler["DELETE"]>>().toBeFunction();
});

test("PageModule and HandlerModule are mutually exclusive", () => {
	type Page = PageModule<"default", { id: string }>;
	type Handler = HandlerModule<{ id: string }>;

	expectTypeOf<Page>().not.toExtend<Handler>();
	expectTypeOf<Handler>().not.toExtend<Page>();
});
