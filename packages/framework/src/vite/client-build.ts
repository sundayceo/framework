import fs from "node:fs";
import path from "node:path";

import { build, transformWithOxc, type Plugin } from "vite";

import { buildImportGraph } from "../codegen-disk/import-graph";
import { buildHydrationManifest } from "../codegen/hydration-manifest";
import { extractSlotModules } from "../codegen/slot-extraction";
import { isHydrateModuleId, loadVirtualSlotModule, resolveHydrateId } from "./virtual-slot-modules";

const CLIENT_OUT_DIR = "dist/client";
const HYDRATE_PREFIX = "virtual:hydrate";

type RouteScanResult = {
	sources: Map<string, string>;
	filePathMap: Record<string, string>;
};

function stripNullByte(id: string): string {
	return id.replace(/^\0/, "");
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

function frameworkClientPlugin(scan: RouteScanResult, srcDir: string): Plugin {
	return {
		name: "sundayceo-framework-client",
		enforce: "pre",
		resolveId: (source: string) => resolveHydrateId(source),
		load(id) {
			return loadHydrateModule(id, scan, srcDir);
		},
		async transform(code, id) {
			if (isHydrateModuleId(stripNullByte(id))) {
				return transformWithOxc(code, id, {
					lang: "jsx",
					jsx: { runtime: "automatic" },
				});
			}
			return undefined;
		},
	};
}

type HydrationManifest = Record<string, Record<string, boolean>>;

function computeHydrationManifest(scan: RouteScanResult, srcDir: string): HydrationManifest {
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
	return buildHydrationManifest({ routes, importGraph });
}

type VirtualEntry = {
	routePath: string;
	slotName: string;
	moduleId: string;
};

function collectVirtualEntries(
	hydrationManifest: HydrationManifest,
	routeSources: Map<string, string>,
): VirtualEntry[] {
	return Object.entries(hydrationManifest).flatMap(([routePath, slots]) => {
		const source = routeSources.get(routePath);
		if (source === undefined) {
			return [];
		}

		const slotModules = extractSlotModules(source, routePath);
		return Object.entries(slots)
			.filter(([, isInteractive]) => isInteractive)
			.filter(([slotName]) => slotModules.has(`${HYDRATE_PREFIX}${routePath}/${slotName}`))
			.map(([slotName]) => ({
				routePath,
				slotName,
				moduleId: `${HYDRATE_PREFIX}${routePath}/${slotName}`,
			}));
	});
}

type ViteManifestEntry = { file: string };
type HydrationAssets = Record<string, Record<string, string>>;

function readHydrationAssets(
	clientOutDir: string,
	virtualEntries: VirtualEntry[],
	assetBase: string,
): HydrationAssets {
	const manifestPath = path.join(clientOutDir, ".vite", "manifest.json");
	const raw = fs.readFileSync(manifestPath, "utf-8");
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	const manifest = JSON.parse(raw) as Record<string, ViteManifestEntry>;

	const idToEntry = new Map(virtualEntries.map((e) => [`${e.moduleId}.jsx`, e]));
	const assets: HydrationAssets = {};

	for (const [key, value] of Object.entries(manifest)) {
		const normalizedKey = key.replace(/^(?:\.\.\/)*\0?/, "");
		const match = idToEntry.get(normalizedKey);
		if (match !== undefined) {
			const routeAssets = assets[match.routePath] ?? {};
			routeAssets[match.slotName] = `${assetBase}/${value.file}`;
			assets[match.routePath] = routeAssets;
		}
	}

	return assets;
}

type ClientBuildInput = {
	rootDir: string;
	srcDir: string;
	routeScan: RouteScanResult;
	clientBase: string;
};

/** Runs the client-side Vite build for interactive slot entries and returns asset mappings. */
export async function runClientBuild(
	input: ClientBuildInput,
): Promise<HydrationAssets | undefined> {
	const { rootDir, srcDir, routeScan, clientBase } = input;

	const hydrationManifest = computeHydrationManifest(routeScan, srcDir);
	const virtualEntries = collectVirtualEntries(hydrationManifest, routeScan.sources);

	if (virtualEntries.length === 0) {
		return undefined;
	}

	const clientOutDir = path.join(rootDir, CLIENT_OUT_DIR);

	await build({
		root: rootDir,
		configFile: false,
		logLevel: "warn",
		plugins: [frameworkClientPlugin(routeScan, srcDir)],
		build: {
			rolldownOptions: {
				input: virtualEntries.map((e) => `${e.moduleId}.jsx`),
			},
			outDir: clientOutDir,
			manifest: true,
			copyPublicDir: false,
		},
	});

	return readHydrationAssets(clientOutDir, virtualEntries, clientBase);
}
