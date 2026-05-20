import { describe, expect, it } from "vitest";

import { frameworkPlugin } from "./vite-plugin";

const VIRTUAL_MODULE_ID = "@sundayceo/framework/server-entry";
const RESOLVED_VIRTUAL_MODULE_ID = "\0@sundayceo/framework/server-entry";
const HYDRATION_MANIFEST_ID = "virtual:hydration-manifest";
const RESOLVED_HYDRATION_MANIFEST_ID = "\0virtual:hydration-manifest";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createPlugin() {
	const plugin = frameworkPlugin();
	(plugin as any).configResolved({ root: "/test" });
	return plugin;
}

describe("vite-plugin resolveId", () => {
	it("returns virtual module ID for @sundayceo/framework/server-entry", () => {
		const plugin = createPlugin();
		const resolved = (plugin as any).resolveId(VIRTUAL_MODULE_ID);
		expect(resolved).toBe(RESOLVED_VIRTUAL_MODULE_ID);
	});

	it("resolves hydration-manifest virtual module", () => {
		const plugin = createPlugin();
		const resolved = (plugin as any).resolveId(HYDRATION_MANIFEST_ID);
		expect(resolved).toBe(RESOLVED_HYDRATION_MANIFEST_ID);
	});

	it("resolves hydrate slot virtual module IDs", () => {
		const plugin = createPlugin();
		const resolved = (plugin as any).resolveId("virtual:hydrate/demo/main");
		expect(resolved).toBe("\0virtual:hydrate/demo/main.jsx");
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
		expect(code).toContain('import { app } from "/test/src/app"');
		expect(code).toContain(
			'import { routes, templates, errorPages, hydrationManifest } from "/test/src/routes.gen"',
		);
		expect(code).toContain(
			"export default createHandler({ app, routes, templates, errorPages, hydrationManifest })",
		);
	});

	it("returns undefined for non-virtual module IDs", () => {
		const plugin = createPlugin();
		expect((plugin as any).load("react")).toBeUndefined();
		expect((plugin as any).load("./src/app.ts")).toBeUndefined();
		expect((plugin as any).load(VIRTUAL_MODULE_ID)).toBeUndefined();
	});
});

describe("vite-plugin metadata", () => {
	it("has correct plugin name", () => {
		const plugin = frameworkPlugin();
		expect(plugin.name).toBe("sundayceo-framework");
	});

	it("enforces pre ordering", () => {
		const plugin = frameworkPlugin();
		expect(plugin.enforce).toBe("pre");
	});
});
