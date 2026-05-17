import fs from "node:fs";
import path from "node:path";

import type { Plugin, ViteDevServer } from "vite";

import { runCodegen } from "./run-codegen";
import { filePathToRoutePath, transformRouteModule } from "./transform-route-module";
import { isHydrateModuleId, loadVirtualSlotModule, resolveHydrateId } from "./virtual-slot-modules";
import { createDevMiddleware } from "./vite-dev-middleware";

const ROUTE_EXTENSIONS = [".tsx", ".ts"];
const PLUGIN_NAME = "sundayceo-framework";
const OUTPUT_FILE = "framework.gen.d.ts";
const MANIFEST_FILE = "routes.gen.ts";
const VIRTUAL_MODULE_ID = "@sundayceo/framework/server-entry";
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

function isWatchedPath(file: string, srcDir: string): boolean {
	const templatesDir = path.join(srcDir, "templates");
	const routesDir = path.join(srcDir, "routes");
	return file.startsWith(templatesDir) || file.startsWith(routesDir);
}

function writeCodegen(srcDir: string): void {
	const { declarations, manifest } = runCodegen(srcDir);
	fs.writeFileSync(path.join(srcDir, OUTPUT_FILE), declarations);
	fs.writeFileSync(path.join(srcDir, MANIFEST_FILE), manifest);
}

function generateServerEntry(srcDir: string): string {
	const appPath = path.join(srcDir, "app");
	const routesPath = path.join(srcDir, "routes.gen");
	return [
		'import { createHandler } from "@sundayceo/framework";',
		`import { app } from "${appPath}";`,
		`import { routes, templates, errorPages } from "${routesPath}";`,
		"export default createHandler({ app, routes, templates, errorPages });",
	].join("\n");
}

function scanRouteSources(srcDir: string): Map<string, string> {
	const routesDir = path.join(srcDir, "routes");
	if (!fs.existsSync(routesDir)) {
		return new Map();
	}

	const files = fs
		.readdirSync(routesDir, { recursive: true })
		.filter(
			(f): f is string => typeof f === "string" && ROUTE_EXTENSIONS.some((ext) => f.endsWith(ext)),
		);

	const sources = new Map<string, string>();
	for (const file of files) {
		const routePath = filePathToRoutePath(file);
		sources.set(routePath, fs.readFileSync(path.join(routesDir, file), "utf-8"));
	}
	return sources;
}

function isRouteFile(file: string, routesDir: string): boolean {
	return file.startsWith(routesDir) && ROUTE_EXTENSIONS.some((ext) => file.endsWith(ext));
}

function watchCodegen(
	watcher: { on: (e: string, cb: (f: string) => void) => void },
	srcDir: string,
): void {
	const handler = (file: string): void => {
		if (isWatchedPath(file, srcDir)) {
			writeCodegen(srcDir);
		}
	};
	watcher.on("add", handler);
	watcher.on("unlink", handler);
}

function transformRoute(code: string, id: string, srcDir: string): string | undefined {
	const routesDir = path.join(srcDir, "routes");

	if (!isRouteFile(id, routesDir)) {
		return undefined;
	}

	const relativePath = path.relative(routesDir, id);
	const routePath = filePathToRoutePath(relativePath);
	const transformed = transformRouteModule({ source: code, routePath });

	return transformed === code ? undefined : transformed;
}

function stripNullByte(id: string): string {
	return id.replace(/^\0/, "");
}

function invalidateHydrateModules(server: ViteDevServer): void {
	for (const moduleId of server.moduleGraph.idToModuleMap.keys()) {
		if (isHydrateModuleId(stripNullByte(moduleId))) {
			const mod = server.moduleGraph.getModuleById(moduleId);
			if (mod !== undefined) {
				server.moduleGraph.invalidateModule(mod);
			}
		}
	}
}

export function frameworkPlugin(): Plugin {
	let srcDir: string;
	let routeSources = new Map<string, string>();

	return {
		name: PLUGIN_NAME,
		enforce: "pre",

		configResolved(config) {
			srcDir = path.join(config.root, "src");
		},

		resolveId(source: string) {
			if (source === VIRTUAL_MODULE_ID) {
				return RESOLVED_VIRTUAL_MODULE_ID;
			}
			return resolveHydrateId(source);
		},

		load(id: string) {
			if (id === RESOLVED_VIRTUAL_MODULE_ID) {
				return generateServerEntry(srcDir);
			}
			const bareId = stripNullByte(id);
			if (isHydrateModuleId(bareId)) {
				return loadVirtualSlotModule(bareId, routeSources) ?? undefined;
			}
			return undefined;
		},

		buildStart() {
			writeCodegen(srcDir);
			routeSources = scanRouteSources(srcDir);
		},

		transform(code, id) {
			return transformRoute(code, id, srcDir);
		},

		handleHotUpdate({ file, server }) {
			const routesDir = path.join(srcDir, "routes");
			if (!isRouteFile(file, routesDir)) {
				return;
			}
			routeSources = scanRouteSources(srcDir);
			invalidateHydrateModules(server);
		},

		configureServer(server) {
			watchCodegen(server.watcher, srcDir);
			return createDevMiddleware({ server, srcDir });
		},
	};
}
