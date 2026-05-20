import fs from "node:fs";
import path from "node:path";

import { transformWithOxc, type Plugin, type ResolvedConfig, type ViteDevServer } from "vite";

import { codegenFromDisk } from "../codegen-disk/codegen";
import { ROUTE_EXTENSIONS } from "../codegen/file-filters";
import { generateServerEntry } from "../codegen/generate-server-entry";
import { serializeManifest } from "../codegen/hydration-manifest";
import { filePathToRoutePath, transformRouteModule } from "../codegen/transform-route-module";
import { runProductionBuild } from "./client-build";
import {
	computeHydrationManifest,
	isHydrateModuleId,
	loadHydrateModule,
	resolveHydrateId,
	stripNullByte,
	type RouteScanResult,
} from "./hydrate-ids";
import { createDevMiddleware } from "./vite-dev-middleware";
const PLUGIN_NAME = "sundayceo-framework";
const OUTPUT_FILE = "framework.gen.d.ts";
const MANIFEST_FILE = "routes.gen.ts";
const VIRTUAL_MODULE_ID = "@sundayceo/framework/server-entry";
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;
const HYDRATION_MANIFEST_ID = "virtual:hydration-manifest";
const RESOLVED_HYDRATION_MANIFEST_ID = `\0${HYDRATION_MANIFEST_ID}`;

type PluginOptions = { clientBase?: string };

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
	return serializeManifest(computeHydrationManifest(scan, srcDir).manifest);
}

function isRouteFile(file: string, routesDir: string): boolean {
	return file.startsWith(routesDir) && ROUTE_EXTENSIONS.some((ext) => file.endsWith(ext));
}

function isTemplateFile(file: string, srcDir: string): boolean {
	const templatesDir = path.join(srcDir, "templates");
	return file.startsWith(templatesDir) && ROUTE_EXTENSIONS.some((ext) => file.endsWith(ext));
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
		file.startsWith(path.join(srcDir, "templates")) || file.startsWith(path.join(srcDir, "routes"))
	);
}

const VIRTUAL_RESOLVE: Record<string, string> = {
	[VIRTUAL_MODULE_ID]: RESOLVED_VIRTUAL_MODULE_ID,
	[HYDRATION_MANIFEST_ID]: RESOLVED_HYDRATION_MANIFEST_ID,
};

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
		ctx.manifestSource ??= generateManifestSource(ctx.routeScan, ctx.srcDir); // eslint-disable-line no-param-reassign -- mutable plugin context
		return ctx.manifestSource;
	}
	return loadHydrateModule(id, ctx.routeScan, ctx.srcDir);
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

function handleHotUpdateHook(file: string, server: ViteDevServer, ctx: PluginContext): void {
	if (isTemplateFile(file, ctx.srcDir)) {
		server.hot.send({ type: "full-reload" });
		return;
	}
	if (!isRouteFile(file, path.join(ctx.srcDir, "routes"))) {
		return;
	}
	/* eslint-disable no-param-reassign -- mutable plugin context, invalidated on file change */
	ctx.routeScan = scanRouteSources(ctx.srcDir);
	ctx.manifestSource = null;
	/* eslint-enable no-param-reassign */
	invalidateModules(server);
}

/** Returns the main Vite plugin that powers codegen, routing, and hydration. */
export function frameworkPlugin(options?: PluginOptions): Plugin {
	const ctx: PluginContext = {
		srcDir: "",
		rootDir: "",
		isBuild: false,
		serverOutDir: "",
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
		async closeBundle() {
			if (ctx.isBuild) {
				await runProductionBuild({
					rootDir: ctx.rootDir,
					srcDir: ctx.srcDir,
					routeScan: ctx.routeScan,
					clientBase: ctx.clientBase,
					serverOutDir: ctx.serverOutDir,
				});
			}
		},
		handleHotUpdate: ({ file, server }) => {
			handleHotUpdateHook(file, server, ctx);
		},
		configureServer: (server) => setupWatcher(ctx, server),
	};
}
