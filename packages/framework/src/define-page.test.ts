import type React from "react";
import { expect, expectTypeOf, test } from "vitest";

import { definePage, type TemplateRegistry } from "./index";

declare module "./index" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TemplateRegistry {
		marketing: true;
		dashboard: true;
	}
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface RouteMap {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		"/blog/[slug]": { slug: string };
		// eslint-disable-next-line @typescript-eslint/naming-convention
		"/users/[id]/posts/[postId]": { id: string; postId: string };
		// eslint-disable-next-line @typescript-eslint/naming-convention
		"/about": Record<string, never>;
	}
}

// --- Runtime tests ---

test("definePage returns config unchanged (identity)", () => {
	const config = {
		template: "marketing" as const,
		// eslint-disable-next-line @typescript-eslint/require-await
		loader: async () => ({ title: "Hello" }),
		defineSlots: ({ loaderData: _loaderData }: { loaderData: { title: string } }) =>
			({ main: null }) as Record<string, React.ReactNode>,
	};

	const result = definePage("/about")(config);

	expect(result).toBe(config);
});

test("definePage is curried — first call returns a function", () => {
	const withPath = definePage("/about");

	expect(typeof withPath).toBe("function");
});

// --- Type tests ---

test("template is constrained to TemplateRegistry keys", () => {
	const result = definePage("/about")({
		template: "marketing",
		defineSlots: () => ({}),
	});

	expectTypeOf(result.template).toEqualTypeOf<keyof TemplateRegistry>();
});

test("params are typed from RouteMap", () => {
	definePage("/blog/[slug]")({
		template: "marketing",
		loader: (ctx) => {
			expectTypeOf(ctx.params).toEqualTypeOf<{ slug: string }>();
			expectTypeOf(ctx.request).toEqualTypeOf<Request>();
			return { post: "test" };
		},
		defineSlots: () => ({}),
	});
});

test("params with multiple segments are typed from RouteMap", () => {
	definePage("/users/[id]/posts/[postId]")({
		template: "dashboard",
		loader: (ctx) => {
			expectTypeOf(ctx.params).toEqualTypeOf<{
				id: string;
				postId: string;
			}>();
			return null;
		},
		defineSlots: () => ({}),
	});
});

test("loaderData flows from loader return to defineSlots", () => {
	definePage("/blog/[slug]")({
		template: "marketing",
		loader: ({ params }) => {
			return { post: { title: "Hello", slug: params.slug } };
		},
		defineSlots: ({ loaderData }) => {
			expectTypeOf(loaderData).toEqualTypeOf<{
				post: { title: string; slug: string };
			}>();
			return {};
		},
	});
});

test("meta function receives typed loaderData", () => {
	definePage("/blog/[slug]")({
		template: "marketing",
		loader: () => ({ postTitle: "Hello" }),
		defineSlots: () => ({}),
		meta: ({ loaderData }) => {
			expectTypeOf(loaderData).toEqualTypeOf<{ postTitle: string }>();
			return { title: loaderData.postTitle };
		},
	});
});

test("meta can be a static object", () => {
	definePage("/about")({
		template: "marketing",
		defineSlots: () => ({}),
		meta: { title: "About", description: "About page" },
	});
});

test("loader is optional — loaderData is undefined when omitted", () => {
	definePage("/about")({
		template: "marketing",
		defineSlots: ({ loaderData }) => {
			expectTypeOf(loaderData).toEqualTypeOf<undefined>();
			return {};
		},
	});
});
