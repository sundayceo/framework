import { expect, test } from "vitest";

import { defineErrorPage } from "./define-error-page";
import { RouteKind } from "./types";

declare module "./types" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TemplateRegistry {
		marketing: true;
	}
}

test("defineErrorPage stamps RouteKind brand on the config", () => {
	const config = {
		template: "marketing" as const,
		loader: () => ({ heading: "Not Found" }),
		defineSlots: () => ({ main: null }),
	};

	const result = defineErrorPage(404)(config);

	expect(result[RouteKind]).toBe("page");
	expect(result.template).toBe(config.template);
	expect(result.loader).toBe(config.loader);
	expect(result.defineSlots).toBe(config.defineSlots);
});
