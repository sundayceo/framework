import { expect, expectTypeOf, test } from "vitest";

import type { SlotMap } from "./core/index";
import { definePage } from "./define-page";

declare module "./index" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TemplateRegistry {
		marketing: true;
	}
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface RouteMap {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		"/about": Record<string, never>;
	}
}

test("definePage returns the config unchanged (runtime identity)", () => {
	const config = {
		template: "marketing" as const,
		loader: () => ({ title: "hello" }),
		defineSlots: () => ({ main: null }),
	};

	const result = definePage("/about")(config);

	expect(result).toBe(config);
});

test("curried call works: definePage('/path')({ template, loader, defineSlots })", () => {
	const step1 = definePage("/about");

	expect(typeof step1).toBe("function");

	const result = step1({
		template: "marketing" as const,
		loader: () => ({ title: "hello" }),
		defineSlots: () => ({ main: null }),
	});

	expect(result).toHaveProperty("template", "marketing");
	expect(result).toHaveProperty("loader");
	expect(result).toHaveProperty("defineSlots");
});

test("loader is optional — defineSlots gets { loaderData: undefined } when omitted", () => {
	const result = definePage("/about")({
		template: "marketing" as const,
		defineSlots: ({ loaderData }) => {
			expectTypeOf(loaderData).toEqualTypeOf<undefined>();
			return { main: null };
		},
	});

	expect(result).toHaveProperty("template", "marketing");
	expect(result).toHaveProperty("defineSlots");
	expect(result).not.toHaveProperty("loader");
});

test("template field is constrained to keyof TemplateRegistry", () => {
	type Step2Arg = Parameters<ReturnType<typeof definePage<"/about">>>[0];

	expectTypeOf<Step2Arg["template"]>().toEqualTypeOf<"marketing" | "default">();
});

test("loader data flows into defineSlots", () => {
	definePage("/about")({
		template: "marketing" as const,
		loader: () => ({ post: { title: "Hello", body: "World" } }),
		defineSlots: ({ loaderData }) => {
			expectTypeOf(loaderData).toEqualTypeOf<{
				post: { title: string; body: string };
			}>();
			return { main: null };
		},
	});
});

test("loader data flows into meta callback", () => {
	definePage("/about")({
		template: "marketing" as const,
		loader: () => ({ post: { title: "Hello" } }),
		defineSlots: () => ({ main: null }),
		meta: ({ loaderData }) => {
			expectTypeOf(loaderData).toEqualTypeOf<{
				post: { title: string };
			}>();
			return { title: loaderData.post.title };
		},
	});
});

test("params are inferred from RouteMap", () => {
	definePage("/blog/[slug]")({
		template: "marketing" as const,
		loader: (ctx) => {
			expectTypeOf(ctx.params).toEqualTypeOf<{ slug: string }>();
			return { ok: true };
		},
		defineSlots: () => ({ main: null }),
	});
});

test("defineSlots returns a SlotMap", () => {
	const result = definePage("/about")({
		template: "marketing" as const,
		defineSlots: () => ({ main: null }),
	});

	expectTypeOf(result.defineSlots).returns.toExtend<SlotMap>();
});

// --- Register pattern: loader receives registered custom context ---

test("loader context includes registered custom context type", () => {
	definePage("/about")({
		template: "marketing" as const,
		loader: (ctx) => {
			// With Register augmented (via index.test.ts declaring Register.app),
			// ctx should include the custom context properties.
			// Without augmentation, ctx should still have request and params.
			expectTypeOf(ctx.request).toEqualTypeOf<Request>();
			return { ok: true };
		},
		defineSlots: () => ({ main: null }),
	});
});
