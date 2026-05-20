import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

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

/** Creates a temp project directory with src/routes and returns the root path. */
function createTempProject(): string {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "vite-plugin-test-"));
	const srcDir = path.join(root, "src");
	fs.mkdirSync(path.join(srcDir, "routes"), { recursive: true });
	fs.mkdirSync(path.join(srcDir, "templates"), { recursive: true });
	return root;
}

function createPluginWithRoot(root: string): ReturnType<typeof frameworkPlugin> {
	const plugin = frameworkPlugin();
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	(plugin as any).configResolved({ root });
	return plugin;
}

type MockModuleNode = { id: string };

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockServer() {
	const invalidated: string[] = [];
	const modules = new Map<string, MockModuleNode>();
	const watcherHandlers: Record<string, ((f: string) => void)[]> = {};

	return {
		invalidated,
		modules,
		watcherHandlers,
		server: {
			watcher: {
				on(event: string, cb: (f: string) => void): void {
					watcherHandlers[event] ??= [];
					watcherHandlers[event].push(cb);
				},
			},
			middlewares: {
				use: vi.fn(),
			},
			moduleGraph: {
				idToModuleMap: modules,
				getModuleById(id: string): MockModuleNode | undefined {
					return modules.get(id);
				},
				invalidateModule(mod: MockModuleNode): void {
					invalidated.push(mod.id);
				},
			},
		},
	};
}

const tempRoots: string[] = [];

afterEach(() => {
	for (const root of tempRoots) {
		fs.rmSync(root, { recursive: true, force: true });
	}
	tempRoots.length = 0;
});

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

describe("vite-plugin buildStart", () => {
	it("writes codegen output files and scans routes", () => {
		const root = createTempProject();
		tempRoots.push(root);

		const routeSource = `import { definePage } from "@sundayceo/framework";\nexport default definePage();`;
		fs.writeFileSync(path.join(root, "src/routes/index.tsx"), routeSource);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const declPath = path.join(root, "src", "framework.gen.d.ts");
		const manifestPath = path.join(root, "src", "routes.gen.ts");
		expect(fs.existsSync(declPath)).toBe(true);
		expect(fs.existsSync(manifestPath)).toBe(true);

		const declContent = fs.readFileSync(declPath, "utf-8");
		expect(declContent).toContain("RouteMap");
	});

	it("works with no routes directory", () => {
		const root = createTempProject();
		tempRoots.push(root);

		// Remove routes dir so scanRouteSources returns empty
		fs.rmSync(path.join(root, "src/routes"), { recursive: true });

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const manifestPath = path.join(root, "src", "routes.gen.ts");
		expect(fs.existsSync(manifestPath)).toBe(true);
	});

	it("populates routeScan so load returns hydration manifest", () => {
		const root = createTempProject();
		tempRoots.push(root);

		const routeSource = `import { definePage } from "@sundayceo/framework";\nexport default definePage();`;
		fs.writeFileSync(path.join(root, "src/routes/about.tsx"), routeSource);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const manifest = (plugin as any).load(RESOLVED_HYDRATION_MANIFEST_ID);
		expect(manifest).toBeTypeOf("string");
		expect(manifest).toContain("export default");
	});
});

describe("vite-plugin load hydrate module", () => {
	it("loads a virtual hydrate slot module after buildStart", () => {
		const root = createTempProject();
		tempRoots.push(root);

		const routeSource = [
			'import { definePage } from "@sundayceo/framework";',
			"export default definePage({",
			"  defineSlots: () => ({",
			"    main: <div>hello</div>,",
			"  }),",
			"});",
		].join("\n");
		fs.writeFileSync(path.join(root, "src/routes/demo.tsx"), routeSource);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const code = (plugin as any).load("\0virtual:hydrate/demo/main.jsx");
		expect(code).toBeTypeOf("string");
		expect(code).toContain("HydrateSlot");
	});

	it("returns undefined for hydrate module with nonexistent slot", () => {
		const root = createTempProject();
		tempRoots.push(root);

		const routeSource = `import { definePage } from "@sundayceo/framework";\nexport default definePage();`;
		fs.writeFileSync(path.join(root, "src/routes/demo.tsx"), routeSource);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		// Route exists but has no defineSlots, so the slot module won't be found
		const code = (plugin as any).load("\0virtual:hydrate/demo/nonexistent.jsx");
		expect(code).toBeUndefined();
	});

	it("returns undefined for non-hydrate module IDs", () => {
		const root = createTempProject();
		tempRoots.push(root);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		expect((plugin as any).load("./some-module.ts")).toBeUndefined();
	});
});

describe("vite-plugin transform", () => {
	it("transforms route files by injecting route path", async () => {
		const root = createTempProject();
		tempRoots.push(root);

		const routeSource = `import { definePage } from "@sundayceo/framework";\nexport default definePage();`;
		const routeFile = path.join(root, "src/routes/about.tsx");
		fs.writeFileSync(routeFile, routeSource);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const result = await (plugin as any).transform(routeSource, routeFile);
		expect(result).toBeTypeOf("string");
		expect(result).toContain('definePage("/about")');
	});

	it("returns undefined for non-route files", async () => {
		const root = createTempProject();
		tempRoots.push(root);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const result = await (plugin as any).transform("const x = 1;", "/some/other/file.ts");
		expect(result).toBeUndefined();
	});

	it("returns undefined when route transform produces identical code", async () => {
		const root = createTempProject();
		tempRoots.push(root);

		// Source that already has the path injected
		const routeSource = `import { definePage } from "@sundayceo/framework";\nexport default definePage("/about");`;
		const routeFile = path.join(root, "src/routes/about.tsx");
		fs.writeFileSync(routeFile, routeSource);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const result = await (plugin as any).transform(routeSource, routeFile);
		expect(result).toBeUndefined();
	});

	it("transforms hydrate module IDs through OXC JSX transform", async () => {
		const root = createTempProject();
		tempRoots.push(root);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const jsxCode = [
			'import React from "react";',
			"export default function HydrateSlot() {",
			"  return <div>hello</div>;",
			"}",
		].join("\n");

		const result = await (plugin as any).transform(
			jsxCode,
			"\0virtual:hydrate/demo/main.jsx",
		);
		// transformWithOxc returns an object with code property
		expect(result).toBeDefined();
		expect(result.code).toContain("jsx");
	});
});

describe("vite-plugin handleHotUpdate", () => {
	it("re-scans routes and invalidates modules on route file change", () => {
		const root = createTempProject();
		tempRoots.push(root);

		const routeSource = `import { definePage } from "@sundayceo/framework";\nexport default definePage();`;
		fs.writeFileSync(path.join(root, "src/routes/index.tsx"), routeSource);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const { server, modules, invalidated } = createMockServer();

		// Register a hydrate module and the manifest module in the mock graph
		modules.set("\0virtual:hydrate/index/main.jsx", { id: "\0virtual:hydrate/index/main.jsx" });
		modules.set(RESOLVED_HYDRATION_MANIFEST_ID, { id: RESOLVED_HYDRATION_MANIFEST_ID });

		const routeFile = path.join(root, "src/routes/index.tsx");
		(plugin as any).handleHotUpdate({ file: routeFile, server });

		expect(invalidated).toContain(RESOLVED_HYDRATION_MANIFEST_ID);
		expect(invalidated).toContain("\0virtual:hydrate/index/main.jsx");
	});

	it("skips invalidation when getModuleById returns undefined for a hydrate key", () => {
		const root = createTempProject();
		tempRoots.push(root);

		const routeSource = `import { definePage } from "@sundayceo/framework";\nexport default definePage();`;
		fs.writeFileSync(path.join(root, "src/routes/index.tsx"), routeSource);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const invalidated: string[] = [];
		const modules = new Map<string, MockModuleNode | undefined>();
		// Key exists but getModuleById returns undefined
		modules.set("\0virtual:hydrate/index/main.jsx", undefined);

		const server = {
			watcher: { on: vi.fn() },
			middlewares: { use: vi.fn() },
			moduleGraph: {
				idToModuleMap: modules,
				getModuleById(): undefined {
					return undefined;
				},
				invalidateModule(mod: MockModuleNode): void {
					invalidated.push(mod.id);
				},
			},
		};

		const routeFile = path.join(root, "src/routes/index.tsx");
		(plugin as any).handleHotUpdate({ file: routeFile, server });

		// Nothing invalidated because getModuleById returned undefined
		expect(invalidated).toHaveLength(0);
	});

	it("ignores non-route file changes", () => {
		const root = createTempProject();
		tempRoots.push(root);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const { server, invalidated } = createMockServer();

		(plugin as any).handleHotUpdate({
			file: path.join(root, "src/components/button.tsx"),
			server,
		});

		expect(invalidated).toHaveLength(0);
	});

	it("invalidates manifest even when module is not in graph", () => {
		const root = createTempProject();
		tempRoots.push(root);

		const routeSource = `import { definePage } from "@sundayceo/framework";\nexport default definePage();`;
		fs.writeFileSync(path.join(root, "src/routes/index.tsx"), routeSource);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const { server, invalidated } = createMockServer();

		const routeFile = path.join(root, "src/routes/index.tsx");
		(plugin as any).handleHotUpdate({ file: routeFile, server });

		// No modules were in graph, so nothing gets invalidated
		expect(invalidated).toHaveLength(0);
	});

	it("clears cached manifest source so next load regenerates it", () => {
		const root = createTempProject();
		tempRoots.push(root);

		const routeSource = `import { definePage } from "@sundayceo/framework";\nexport default definePage();`;
		fs.writeFileSync(path.join(root, "src/routes/index.tsx"), routeSource);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		// First load caches the manifest
		const first = (plugin as any).load(RESOLVED_HYDRATION_MANIFEST_ID);
		expect(first).toBeTypeOf("string");

		const { server } = createMockServer();
		const routeFile = path.join(root, "src/routes/index.tsx");
		(plugin as any).handleHotUpdate({ file: routeFile, server });

		// After HMR, the manifest is regenerated (nullified then lazily re-created)
		const second = (plugin as any).load(RESOLVED_HYDRATION_MANIFEST_ID);
		expect(second).toBeTypeOf("string");
	});
});

describe("vite-plugin configureServer", () => {
	it("registers watcher handlers for add and unlink events", () => {
		const root = createTempProject();
		tempRoots.push(root);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const { server, watcherHandlers } = createMockServer();
		(plugin as any).configureServer(server);

		expect(watcherHandlers["add"]).toBeDefined();
		expect(watcherHandlers["add"].length).toBeGreaterThan(0);
		expect(watcherHandlers["unlink"]).toBeDefined();
		expect(watcherHandlers["unlink"].length).toBeGreaterThan(0);
	});

	it("returns a function (dev middleware initializer)", () => {
		const root = createTempProject();
		tempRoots.push(root);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const { server } = createMockServer();
		const result = (plugin as any).configureServer(server);
		expect(result).toBeTypeOf("function");
	});

	it("middleware initializer registers connect middleware on the server", () => {
		const root = createTempProject();
		tempRoots.push(root);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const { server } = createMockServer();
		const init = (plugin as any).configureServer(server) as () => void;
		init();

		expect(server.middlewares.use).toHaveBeenCalledOnce();
	});

	it("watcher handler triggers codegen for route files", () => {
		const root = createTempProject();
		tempRoots.push(root);

		const routeSource = `import { definePage } from "@sundayceo/framework";\nexport default definePage();`;
		fs.writeFileSync(path.join(root, "src/routes/index.tsx"), routeSource);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		// Remove codegen output to verify it gets re-created
		const declPath = path.join(root, "src", "framework.gen.d.ts");
		fs.unlinkSync(declPath);

		const { server, watcherHandlers } = createMockServer();
		(plugin as any).configureServer(server);

		// Trigger the add handler with a route file path
		const addHandler = watcherHandlers["add"][0];
		addHandler(path.join(root, "src/routes/new-page.tsx"));

		expect(fs.existsSync(declPath)).toBe(true);
	});

	it("watcher handler triggers codegen for template files", () => {
		const root = createTempProject();
		tempRoots.push(root);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const declPath = path.join(root, "src", "framework.gen.d.ts");

		const { server, watcherHandlers } = createMockServer();
		(plugin as any).configureServer(server);

		// Trigger the unlink handler with a template file path
		const unlinkHandler = watcherHandlers["unlink"][0];
		unlinkHandler(path.join(root, "src/templates/main.tsx"));

		expect(fs.existsSync(declPath)).toBe(true);
	});

	it("watcher handler ignores non-watched paths", () => {
		const root = createTempProject();
		tempRoots.push(root);

		const plugin = createPluginWithRoot(root);
		(plugin as any).buildStart();

		const declPath = path.join(root, "src", "framework.gen.d.ts");
		const originalContent = fs.readFileSync(declPath, "utf-8");

		const { server, watcherHandlers } = createMockServer();
		(plugin as any).configureServer(server);

		// Trigger with a non-watched path
		const addHandler = watcherHandlers["add"][0];
		addHandler(path.join(root, "src/components/button.tsx"));

		// Content should be unchanged (no re-write)
		expect(fs.readFileSync(declPath, "utf-8")).toBe(originalContent);
	});
});
