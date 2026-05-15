import { describe, expect, it } from "vitest";

import { frameworkPlugin } from "./vite-plugin";

const VIRTUAL_MODULE_ID = "@sundayceo/framework/server-entry";
const RESOLVED_VIRTUAL_MODULE_ID = "\0@sundayceo/framework/server-entry";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createPlugin() {
	const plugin = frameworkPlugin();
	// Simulate configResolved so srcDir is set
	(plugin as any).configResolved({ root: "/test" });
	return plugin;
}

describe("vite-plugin resolveId", () => {
	it("returns virtual module ID for @sundayceo/framework/server-entry", () => {
		const plugin = createPlugin();
		const resolved = (plugin as any).resolveId(VIRTUAL_MODULE_ID);
		expect(resolved).toBe(RESOLVED_VIRTUAL_MODULE_ID);
	});

	it("returns undefined for other module IDs", () => {
		const plugin = createPlugin();
		expect((plugin as any).resolveId("react")).toBeUndefined();
		expect((plugin as any).resolveId("@sundayceo/framework")).toBeUndefined();
		expect((plugin as any).resolveId("./src/app")).toBeUndefined();
	});
});

describe("vite-plugin load", () => {
	it("returns generated code for the virtual module ID", () => {
		const plugin = createPlugin();
		const code = (plugin as any).load(RESOLVED_VIRTUAL_MODULE_ID);
		expect(code).toBeTypeOf("string");
		expect(code).toContain('import { createHandler } from "@sundayceo/framework"');
		expect(code).toContain('import { app } from "./src/app"');
		expect(code).toContain('import { routes, templates, errorPages } from "./src/routes.gen"');
		expect(code).toContain("export default createHandler({ app, routes, templates, errorPages })");
	});

	it("returns undefined for non-virtual module IDs", () => {
		const plugin = createPlugin();
		expect((plugin as any).load("react")).toBeUndefined();
		expect((plugin as any).load("./src/app.ts")).toBeUndefined();
		expect((plugin as any).load(VIRTUAL_MODULE_ID)).toBeUndefined();
	});
});
