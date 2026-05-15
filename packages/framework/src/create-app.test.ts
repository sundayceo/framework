import { expect, expectTypeOf, test } from "vitest";

import { createApp, type AppConfig } from "./create-app";

test("createApp returns the config object unchanged", () => {
	const contextFn = (_req: Request): { sdk: { call: () => string } } => ({
		sdk: { call: () => "result" },
	});
	const config = { context: contextFn };
	const app = createApp(config);

	expect(app).toBe(config);
});

test("createApp accepts config with onError handler", () => {
	const config = {
		context: (_req: Request) => ({ db: "connection" as const }),
		onError: (_error: unknown, _req: Request) =>
			new Response("Internal Server Error", { status: 500 }),
	};
	const app = createApp(config);

	expect(app).toBe(config);
	expect(app.onError).toBeDefined();
});

test("createApp works without onError (it is optional)", () => {
	const app = createApp({
		context: (_req: Request) => ({ value: 42 }),
	});

	expect(app.onError).toBeUndefined();
});

test("context return type is preserved in AppConfig", () => {
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	const noop = (_msg: string): void => {};
	const app = createApp({
		context: (_req: Request) => ({
			sdk: { apiKey: "secret" },
			logger: { log: noop },
		}),
	});

	expect(app.context).toBeTypeOf("function");

	type ContextReturn = Awaited<ReturnType<(typeof app)["context"]>>;
	expectTypeOf<ContextReturn>().toEqualTypeOf<{
		sdk: { apiKey: string };
		logger: { log: (msg: string) => void };
	}>();
});

test("AppConfig type preserves custom context type parameter", () => {
	type MyConfig = AppConfig<{ sdk: { call: () => string } }>;

	expectTypeOf<MyConfig["context"]>().toEqualTypeOf<
		(request: Request, platform?: unknown) =>
			| { sdk: { call: () => string } }
			| Promise<{ sdk: { call: () => string } }>
	>();

	expectTypeOf<NonNullable<MyConfig["onError"]>>().toEqualTypeOf<
		(error: unknown, request: Request) => Response | Promise<Response>
	>();
});

test("omitting TPlatform defaults platform to unknown", () => {
	type DefaultConfig = AppConfig<{ value: number }>;

	expectTypeOf<Parameters<DefaultConfig["context"]>>().toEqualTypeOf<
		[Request, (unknown | undefined)?]
	>();
});

test("context factory receives typed platform as second arg", () => {
	type Env = { API_KEY: string; DB_URL: string };

	type EnvConfig = AppConfig<{ apiKey: string }, Env>;

	expectTypeOf<Parameters<EnvConfig["context"]>>().toEqualTypeOf<
		[Request, (Env | undefined)?]
	>();
});

test("platform type flows from createApp generic to context factory", () => {
	type Env = { API_KEY: string };

	const app = createApp<Env>({
		context: (_req, platform) => ({
			key: platform?.API_KEY ?? "",
		}),
	});

	type ContextFn = (typeof app)["context"];
	expectTypeOf<ContextFn>().parameter(1).toEqualTypeOf<Env | undefined>();
});
