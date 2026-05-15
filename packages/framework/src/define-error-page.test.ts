import { expect, expectTypeOf, test } from "vitest";

import { defineErrorPage, type ErrorContext } from "./define-error-page";

declare module "./index" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TemplateRegistry {
		marketing: true;
	}
}

test("defineErrorPage returns the config unchanged (runtime identity)", () => {
	const config = {
		template: "marketing" as const,
		loader: () => ({ heading: "Not Found" }),
		defineSlots: () => ({ main: null }),
	};

	const result = defineErrorPage(404)(config);

	expect(result).toBe(config);
});

test("loader receives non-optional error: ErrorContext", () => {
	defineErrorPage(500)({
		template: "marketing" as const,
		loader: (ctx) => {
			expectTypeOf(ctx.error).toEqualTypeOf<ErrorContext>();
			expect(ctx.error.status).toBe(500);
			return { heading: "Server Error" };
		},
		defineSlots: () => ({ main: null }),
	});
});

test("meta field is supported with loader data", () => {
	const result = defineErrorPage(500)({
		template: "marketing" as const,
		loader: () => ({ heading: "Oops" }),
		defineSlots: () => ({ main: null }),
		meta: ({ loaderData }) => {
			expectTypeOf(loaderData).toEqualTypeOf<{ heading: string }>();
			return { title: loaderData.heading };
		},
	});

	expect(result).toHaveProperty("meta");
});

test("ctx.error is ErrorContext and is NOT optional", () => {
	defineErrorPage(404)({
		template: "marketing" as const,
		loader: (ctx) => {
			expectTypeOf(ctx).toHaveProperty("error");
			expectTypeOf(ctx.error).toEqualTypeOf<ErrorContext>();

			expectTypeOf(ctx.error.status).toBeNumber();
			expectTypeOf(ctx.error.message).toBeString();
			expectTypeOf(ctx.error.stack).toEqualTypeOf<string | undefined>();
			expectTypeOf(ctx.error.error).toEqualTypeOf<unknown>();

			return {};
		},
		defineSlots: () => ({ main: null }),
	});
});
