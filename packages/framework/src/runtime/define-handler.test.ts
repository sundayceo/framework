import { expect, test } from "vitest";

import { defineHandler } from "./define-handler";
import { RouteKind } from "./types";

declare module "./types" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface RouteMap {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		"/api/health": Record<string, never>;
	}
}

test("defineHandler stamps RouteKind brand on the config", () => {
	const config = {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		GET: () => Response.json({ ok: true }),
	};

	const result = defineHandler("/api/health")(config);

	expect(result[RouteKind]).toBe("handler");
	expect(result.GET).toBe(config.GET);
});

test("defineHandler allows omitting all methods", () => {
	const result = defineHandler("/api/health")({});

	expect(result[RouteKind]).toBe("handler");
});
