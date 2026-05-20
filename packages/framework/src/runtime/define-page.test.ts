import { expect, expectTypeOf, test } from "vitest";

import { definePage } from "./define-page";
import { RouteKind, type SlotMap } from "./types";

declare module "./types" {
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

test("definePage stamps RouteKind brand on the config", () => {
	const config = {
		template: "marketing" as const,
		loader: () => ({ title: "hello" }),
		defineSlots: () => ({ main: null }),
	};

	const result = definePage("/about")(config);

	expect(result[RouteKind]).toBe("page");
	expect(result.template).toBe(config.template);
	expect(result.loader).toBe(config.loader);
	expect(result.defineSlots).toBe(config.defineSlots);
});

test("loader is optional — defineSlots takes no arguments when omitted", () => {
	const result = definePage("/about")({
		template: "marketing" as const,
		defineSlots: () => ({ main: null }),
	});

	expectTypeOf(result.defineSlots).toEqualTypeOf<() => SlotMap>();
	expect(result).toHaveProperty("template", "marketing");
	expect(result).toHaveProperty("defineSlots");
	expect(result).not.toHaveProperty("loader");
});
