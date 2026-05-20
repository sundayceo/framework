import fs from "node:fs";
import path from "node:path";

import { transformWithOxc, type Plugin, type ViteDevServer } from "vite";

import { codegenFromDisk } from "../codegen-disk/codegen";
import { buildImportGraph } from "../codegen-disk/import-graph";
import { generateServerEntry } from "../codegen/generate-server-entry";
import { buildHydrationManifest, serializeManifest } from "../codegen/hydration-manifest";
import { filePathToRoutePath, transformRouteModule } from "../codegen/transform-route-module";
import { isHydrateModuleId, loadVirtualSlotModule, resolveHydrateId } from "./virtual-slot-modules";
import { createDevMiddleware } from "./vite-dev-middleware";

const ROUTE_EXTENSIONS = [".tsx", ".ts"];
const PLUGIN_NAME = "sundayceo-framework";
const OUTPUT_FILE = "framework.gen.d.ts";
const MANIFEST_FILE = "routes.gen.ts";
const VIRTUAL_MODULE_ID = "@sundayceo/framework/server-entry";
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;
const HYDRATION_MANIFEST_ID = "virtual:hydration-manifest";
const RESOLVED_HYDRATION_MANIFEST_ID = `\0${HYDRATION_MANIFEST_ID}`;

function isWatchedPath(file: string, srcDir: string): boolean {
	const templatesDir = path.join(srcDir, "templates");
	const routesDir = path.join(srcDir, "routes");
	return file.startsWith(templatesDir) || file.startsWith(routesDir);
}

function writeCodegen(srcDir: string): void {
	const { declarations, manifest } = codegenFromDisk(srcDir);
	fs.writeFileSync(path.join(srcDir, OUTPUT_FILE), declarations);
	fs.writeFileSync(path.join(srcDir, MANIFEST_FILE), manifest);
}

function buildServerEntry(srcDir: string): string {
	return generateServerEntry({
		appModule: path.join(srcDir, "app"),
		routesModule: path.join(srcDir, "routes.gen"),
	});
}

type RouteScanResult = {
	sources: Map<string, string>;
	filePathMap: Record<string, string>;
};

function scanRouteSources(srcDir: string): RouteScanResult {
	const routesDir = path.join(srcDir, "routes");
	if (!fs.existsSync(routesDir)) {
		return { sources: new Map(), filePathMap: {} };
	}

	const files = fs
		.readdirSync(routesDir, { recursive: true })
		.filter(
			(f): f is string => typeof f === "string" && ROUTE_EXTENSIONS.some((ext) => f.endsWith(ext)),
		);

	const sources = new Map<string, string>();
	const filePathMap: Record<string, string> = {};
	for (const file of files) {
		const routePath = filePathToRoutePath(file);
		sources.set(routePath, fs.readFileSync(path.join(routesDir, file), "utf-8"));
		filePathMap[routePath] = file;
	}
	return { sources, filePathMap };
}

function generateManifestSource(scan: RouteScanResult, srcDir: string): string {
	const routes = [...scan.sources.entries()].map(([routePath, source]) => ({
		routePath,
		source,
	}));
	const routesDir = path.join(srcDir, "routes");
	const importGraph = buildImportGraph(
		Object.fromEntries(scan.sources),
		routesDir,
		scan.filePathMap,
	);
	const manifest = buildHydrationManifest({ routes, importGraph });
	return serializeManifest(manifest);
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

const VIRTUAL_RESOLVE: Record<string, string> = {
	[VIRTUAL_MODULE_ID]: RESOLVED_VIRTUAL_MODULE_ID,
	[HYDRATION_MANIFEST_ID]: RESOLVED_HYDRATION_MANIFEST_ID,
};

function resolveVirtualId(source: string): string | undefined {
	return VIRTUAL_RESOLVE[source] ?? resolveHydrateId(source);
}

function invalidateManifest(server: ViteDevServer): void {
	const mod = server.moduleGraph.getModuleById(RESOLVED_HYDRATION_MANIFEST_ID);
	if (mod !== undefined) {
		server.moduleGraph.invalidateModule(mod);
	}
}

function loadHydrateModule(id: string, scan: RouteScanResult, srcDir: string): string | undefined {
	const bareId = stripNullByte(id);
	if (!isHydrateModuleId(bareId)) {
		return undefined;
	}
	const routesDir = path.join(srcDir, "routes");
	return (
		loadVirtualSlotModule({
			id: bareId,
			routeSources: scan.sources,
			routesDir,
			filePathMap: scan.filePathMap,
		}) ?? undefined
	);
}

async function transformJsxModule(code: string, id: string): ReturnType<typeof transformWithOxc> {
	return transformWithOxc(code, id, {
		lang: "jsx",
		jsx: { runtime: "automatic" },
	});
}

/** Returns the main Vite plugin that powers codegen, routing, and hydration. */
export function frameworkPlugin(): Plugin {
	let srcDir = "";
	let routeScan: RouteScanResult = { sources: new Map(), filePathMap: {} };
	let manifestSource: string | null = null;

	return {
		name: PLUGIN_NAME,
		enforce: "pre",
		configResolved(config) {
			srcDir = path.join(config.root, "src");
		},
		resolveId: (source: string) => resolveVirtualId(source),
		load(id) {
			if (id === RESOLVED_VIRTUAL_MODULE_ID) {
				return buildServerEntry(srcDir);
			}
			if (id === RESOLVED_HYDRATION_MANIFEST_ID) {
				manifestSource ??= generateManifestSource(routeScan, srcDir);
				return manifestSource;
			}
			return loadHydrateModule(id, routeScan, srcDir);
		},
		buildStart() {
			writeCodegen(srcDir);
			routeScan = scanRouteSources(srcDir);
			manifestSource = generateManifestSource(routeScan, srcDir);
		},
		async transform(code, id) {
			if (isHydrateModuleId(stripNullByte(id))) {
				return transformJsxModule(code, id);
			}
			return transformRoute(code, id, srcDir);
		},
		handleHotUpdate({ file, server }) {
			if (!isRouteFile(file, path.join(srcDir, "routes"))) {
				return;
			}
			routeScan = scanRouteSources(srcDir);
			manifestSource = null;
			invalidateManifest(server);
			invalidateHydrateModules(server);
		},
		configureServer(server) {
			watchCodegen(server.watcher, srcDir);
			return createDevMiddleware({ server, srcDir });
		},
	};
}
