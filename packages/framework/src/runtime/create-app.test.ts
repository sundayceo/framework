import { expect, test } from "vitest";

import { createApp } from "./create-app";

test("createApp returns the config object unchanged", () => {
	const contextFn = (_req: Request): { sdk: { call: () => string } } => ({
		sdk: { call: () => "result" },
	});
	const config = { context: contextFn };
	const app = createApp(config);

	expect(app).toBe(config);
});
