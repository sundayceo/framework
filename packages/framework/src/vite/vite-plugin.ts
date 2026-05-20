import fs from "node:fs";
import path from "node:path";

import { transformWithOxc, type Plugin, type ResolvedConfig, type ViteDevServer } from "vite";

import { codegenFromDisk } from "../codegen-disk/codegen";
import { buildImportGraph } from "../codegen-disk/import-graph";
import { generateServerEntry } from "../codegen/generate-server-entry";
import { buildHydrationManifest, serializeManifest } from "../codegen/hydration-manifest";
import { filePathToRoutePath, transformRouteModule } from "../codegen/transform-route-module";
import { runClientBuild } from "./client-build";
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

type PluginOptions = { clientBase?: string };

type RouteScanResult = {
	sources: Map<string, string>;
	filePathMap: Record<string, string>;
};

function writeCodegen(srcDir: string): void {
	const { declarations, manifest } = codegenFromDisk(srcDir);
	fs.writeFileSync(path.join(srcDir, OUTPUT_FILE), declarations);
	fs.writeFileSync(path.join(srcDir, MANIFEST_FILE), manifest);
}

function scanRouteSources(srcDir: string): RouteScanResult {
	const routesDir = path.join(srcDir, "routes");
	if (!fs.existsSync(routesDir)) {
		return { sources: new Map(), filePathMap: {} };
	}

	const files = fs
		.readdirSync(routesDir, { recursive: true })
		.filter(
			(f): f is string =>
				typeof f === "string" && ROUTE_EXTENSIONS.some((ext) => f.endsWith(ext)),
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
	return serializeManifest(buildHydrationManifest({ routes, importGraph }));
}

function isRouteFile(file: string, routesDir: string): boolean {
	return file.startsWith(routesDir) && ROUTE_EXTENSIONS.some((ext) => file.endsWith(ext));
}

function stripNullByte(id: string): string {
	return id.replace(/^\0/, "");
}

function resolveHydrateModule(id: string, scan: RouteScanResult, srcDir: string): string | undefined {
	const bareId = stripNullByte(id);
	if (!isHydrateModuleId(bareId)) {
		return undefined;
	}
	return (
		loadVirtualSlotModule({
			id: bareId,
			routeSources: scan.sources,
			routesDir: path.join(srcDir, "routes"),
			filePathMap: scan.filePathMap,
		}) ?? undefined
	);
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

function invalidateModules(server: ViteDevServer): void {
	const manifestMod = server.moduleGraph.getModuleById(RESOLVED_HYDRATION_MANIFEST_ID);
	if (manifestMod !== undefined) {
		server.moduleGraph.invalidateModule(manifestMod);
	}

	for (const moduleId of server.moduleGraph.idToModuleMap.keys()) {
		if (isHydrateModuleId(stripNullByte(moduleId))) {
			const mod = server.moduleGraph.getModuleById(moduleId);
			if (mod !== undefined) {
				server.moduleGraph.invalidateModule(mod);
			}
		}
	}
}

function isWatchedPath(file: string, srcDir: string): boolean {
	return (
		file.startsWith(path.join(srcDir, "templates")) ||
		file.startsWith(path.join(srcDir, "routes"))
	);
}

const VIRTUAL_RESOLVE: Record<string, string> = {
	[VIRTUAL_MODULE_ID]: RESOLVED_VIRTUAL_MODULE_ID,
	[HYDRATION_MANIFEST_ID]: RESOLVED_HYDRATION_MANIFEST_ID,
};

const PLACEHOLDER = '"__SUNDAYCEO_HYDRATION_ASSETS__"';

type PluginContext = {
	srcDir: string;
	rootDir: string;
	isBuild: boolean;
	serverOutDir: string;
	clientBase: string;
	routeScan: RouteScanResult;
	manifestSource: string | null;
};

function loadVirtualModule(id: string, ctx: PluginContext): string | undefined {
	if (id === RESOLVED_VIRTUAL_MODULE_ID) {
		return generateServerEntry({
			appModule: path.join(ctx.srcDir, "app"),
			routesModule: path.join(ctx.srcDir, "routes.gen"),
			shouldUsePlaceholder: ctx.isBuild,
		});
	}
	if (id === RESOLVED_HYDRATION_MANIFEST_ID) {
		ctx.manifestSource ??= generateManifestSource(ctx.routeScan, ctx.srcDir); // eslint-disable-line no-param-reassign
		return ctx.manifestSource;
	}
	return resolveHydrateModule(id, ctx.routeScan, ctx.srcDir);
}

function patchServerBundle(
	serverOutDir: string,
	hydrationAssets: Record<string, Record<string, string>>,
): void {
	const files = fs.readdirSync(serverOutDir).filter((f) => f.endsWith(".js"));
	const replacement = JSON.stringify(hydrationAssets);

	for (const file of files) {
		const filePath = path.join(serverOutDir, file);
		const content = fs.readFileSync(filePath, "utf-8");
		if (content.includes(PLACEHOLDER)) {
			fs.writeFileSync(filePath, content.replace(PLACEHOLDER, replacement));
		}
	}
}

function setupWatcher(ctx: PluginContext, server: ViteDevServer): () => void {
	const handler = (file: string): void => {
		if (isWatchedPath(file, ctx.srcDir)) {
			writeCodegen(ctx.srcDir);
		}
	};
	server.watcher.on("add", handler);
	server.watcher.on("unlink", handler);
	return createDevMiddleware({ server, srcDir: ctx.srcDir });
}

async function runCloseBundleHook(ctx: PluginContext): Promise<void> {
	if (!ctx.isBuild) {
		return;
	}
	const assets = await runClientBuild({
		rootDir: ctx.rootDir, srcDir: ctx.srcDir,
		routeScan: ctx.routeScan, clientBase: ctx.clientBase,
	});
	if (assets !== undefined) {
		patchServerBundle(path.resolve(ctx.rootDir, ctx.serverOutDir), assets);
	}
}

/** Returns the main Vite plugin that powers codegen, routing, and hydration. */
export function frameworkPlugin(options?: PluginOptions): Plugin {
	const ctx: PluginContext = {
		srcDir: "", rootDir: "", isBuild: false, serverOutDir: "",
		clientBase: options?.clientBase ?? "/_client",
		routeScan: { sources: new Map(), filePathMap: {} },
		manifestSource: null,
	};

	return {
		name: PLUGIN_NAME,
		enforce: "pre",
		configResolved(config: ResolvedConfig) {
			ctx.srcDir = path.join(config.root, "src");
			ctx.rootDir = config.root;
			ctx.isBuild = config.command === "build";
			ctx.serverOutDir = config.build.outDir;
		},
		resolveId: (source: string) => VIRTUAL_RESOLVE[source] ?? resolveHydrateId(source),
		load: (id: string) => loadVirtualModule(id, ctx),
		buildStart() {
			writeCodegen(ctx.srcDir);
			ctx.routeScan = scanRouteSources(ctx.srcDir);
			ctx.manifestSource = generateManifestSource(ctx.routeScan, ctx.srcDir);
		},
		async transform(code, id) {
			if (isHydrateModuleId(stripNullByte(id))) {
				return transformWithOxc(code, id, { lang: "jsx", jsx: { runtime: "automatic" } });
			}
			return transformRoute(code, id, ctx.srcDir);
		},
		closeBundle: () => runCloseBundleHook(ctx),
		handleHotUpdate({ file, server }) {
			if (!isRouteFile(file, path.join(ctx.srcDir, "routes"))) {
				return;
			}
			ctx.routeScan = scanRouteSources(ctx.srcDir);
			ctx.manifestSource = null;
			invalidateModules(server);
		},
		configureServer: (server) => setupWatcher(ctx, server),
	};
}
