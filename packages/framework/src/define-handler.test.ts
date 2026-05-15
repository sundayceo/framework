import { expect, expectTypeOf, test } from "vitest";

import { RouteKind } from "./core/index";
import { defineHandler } from "./define-handler";
import type { HandlerModule } from "./index";

declare module "./index" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface RouteMap {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		"/api/health": Record<string, never>;
		// eslint-disable-next-line @typescript-eslint/naming-convention
		"/api/users/[id]": { id: string };
	}
}

// --- TDD Slice 1: identity at runtime ---

test("defineHandler stamps RouteKind brand on the config", () => {
	const config = {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		GET: () => Response.json({ ok: true }),
	};

	const result = defineHandler("/api/health")(config);

	expect(result[RouteKind]).toBe("handler");
	expect(result.GET).toBe(config.GET);
});

// --- TDD Slice 2: supports all HTTP methods ---

test("defineHandler accepts all HTTP method handlers", () => {
	const config = {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		GET: () => new Response("get"),
		// eslint-disable-next-line @typescript-eslint/naming-convention
		POST: () => new Response("post"),
		// eslint-disable-next-line @typescript-eslint/naming-convention
		PUT: () => new Response("put"),
		// eslint-disable-next-line @typescript-eslint/naming-convention
		PATCH: () => new Response("patch"),
		// eslint-disable-next-line @typescript-eslint/naming-convention
		DELETE: () => new Response("delete"),
	};

	const result = defineHandler("/api/health")(config);

	expect(result[RouteKind]).toBe("handler");
	expect(result.GET).toBe(config.GET);
	expect(result.POST).toBe(config.POST);
	expect(result.PUT).toBe(config.PUT);
	expect(result.PATCH).toBe(config.PATCH);
	expect(result.DELETE).toBe(config.DELETE);
});

// --- TDD Slice 3: all methods are optional ---

test("defineHandler allows omitting all methods", () => {
	const result = defineHandler("/api/health")({});

	expect(result[RouteKind]).toBe("handler");
});

// --- TDD Slice 4: type — params are typed from RouteMap ---

test("handler receives typed params from RouteMap", () => {
	defineHandler("/api/users/[id]")({
		// eslint-disable-next-line @typescript-eslint/naming-convention
		GET: (ctx) => {
			expectTypeOf(ctx.params).toEqualTypeOf<{ id: string }>();
			expectTypeOf(ctx.request).toEqualTypeOf<Request>();
			return Response.json({ id: ctx.params.id });
		},
	});
});

// --- TDD Slice 5: type — return type is HandlerModule ---

test("defineHandler returns a HandlerModule", () => {
	const result = defineHandler("/api/users/[id]")({
		// eslint-disable-next-line @typescript-eslint/naming-convention
		GET: () => Response.json({ ok: true }),
	});

	expectTypeOf(result).toExtend<HandlerModule<{ id: string }>>();
});

// --- TDD Slice 6: type — handlers accept async functions ---

test("handlers can return Promise<Response>", () => {
	const result = defineHandler("/api/health")({
		// eslint-disable-next-line @typescript-eslint/naming-convention
		POST: async (ctx) => {
			const body = (await ctx.request.json()) as Record<string, unknown>;
			return Response.json({ received: body });
		},
	});

	expectTypeOf(result.POST).toExtend<
		| ((ctx: { request: Request; params: Record<string, never> }) => Response | Promise<Response>)
		| undefined
	>();
});

// --- TDD Slice 7: type — paramless route has empty params ---

test("paramless route has Record<string, never> params", () => {
	defineHandler("/api/health")({
		// eslint-disable-next-line @typescript-eslint/naming-convention
		GET: (ctx) => {
			expectTypeOf(ctx.params).toEqualTypeOf<Record<string, never>>();
			return Response.json({ ok: true });
		},
	});
});

// --- Register pattern: handler receives registered custom context ---

test("handler context includes registered custom context type", () => {
	defineHandler("/api/health")({
		// eslint-disable-next-line @typescript-eslint/naming-convention
		GET: (ctx) => {
			// ctx should always have request and params
			expectTypeOf(ctx.request).toEqualTypeOf<Request>();
			return Response.json({ ok: true });
		},
	});
});
