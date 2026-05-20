import fs from "node:fs";
import path from "node:path";

import { build, transformWithOxc, type Plugin } from "vite";

import { buildSlotKey, type SlotModule } from "../codegen/slot-extraction";
import type { HydrationManifest } from "../codegen/hydration-manifest";
import {
	HYDRATE_PREFIX,
	computeHydrationManifest,
	isHydrateModuleId,
	loadHydrateModule,
	resolveHydrateId,
	stripNullByte,
	type RouteScanResult,
} from "./hydrate-ids";

const CLIENT_OUT_DIR = "dist/client";

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

type VirtualEntry = {
	routePath: string;
	slotName: string;
	moduleId: string;
};

function collectVirtualEntries(
	hydrationManifest: HydrationManifest,
	slotModulesByRoute: Map<string, Map<string, SlotModule>>,
): VirtualEntry[] {
	return Object.entries(hydrationManifest).flatMap(([routePath, slots]) => {
		const slotModules = slotModulesByRoute.get(routePath);
		if (slotModules === undefined) {
			return [];
		}

		return Object.entries(slots)
			.filter(([, isInteractive]) => isInteractive)
			.filter(([slotName]) => slotModules.has(buildSlotKey(routePath, slotName)))
			.map(([slotName]) => ({
				routePath,
				slotName,
				moduleId: `${HYDRATE_PREFIX}${routePath}/${slotName}`,
			}));
	});
}

type ViteManifestEntry = { file: string };
type HydrationAssets = Record<string, Record<string, string>>;

function isManifestEntry(value: unknown): value is ViteManifestEntry {
	return typeof value === "object" && value !== null && "file" in value && typeof value.file === "string";
}

function readHydrationAssets(
	clientOutDir: string,
	virtualEntries: VirtualEntry[],
	assetBase: string,
): HydrationAssets {
	const manifestPath = path.join(clientOutDir, ".vite", "manifest.json");
	const raw = fs.readFileSync(manifestPath, "utf-8");
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- JSON.parse returns any
	const manifest: Record<string, unknown> = JSON.parse(raw) as Record<string, unknown>;

	const idToEntry = new Map(virtualEntries.map((e) => [`${e.moduleId}.jsx`, e]));
	const assets: HydrationAssets = {};

	for (const [key, value] of Object.entries(manifest)) {
		const normalizedKey = key.replace(/^(?:\.\.\/)*\0?/, "");
		const match = idToEntry.get(normalizedKey);
		if (match !== undefined && isManifestEntry(value)) {
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

async function runClientBuild(input: ClientBuildInput): Promise<HydrationAssets | undefined> {
	const { rootDir, srcDir, routeScan, clientBase } = input;

	const { manifest: hydrationManifest, slotModulesByRoute } = computeHydrationManifest(routeScan, srcDir);
	const virtualEntries = collectVirtualEntries(hydrationManifest, slotModulesByRoute);

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

const PLACEHOLDER = '"__SUNDAYCEO_HYDRATION_ASSETS__"';

function patchServerBundle(serverOutDir: string, hydrationAssets: HydrationAssets): void {
	const files = fs.readdirSync(serverOutDir, { recursive: true }).filter((f) =>
		String(f).endsWith(".js"),
	);
	const replacement = JSON.stringify(hydrationAssets);

	for (const file of files) {
		const filePath = path.join(serverOutDir, String(file));
		const content = fs.readFileSync(filePath, "utf-8");
		if (content.includes(PLACEHOLDER)) {
			fs.writeFileSync(filePath, content.replaceAll(PLACEHOLDER, replacement));
		}
	}
}

type ProductionBuildInput = ClientBuildInput & { serverOutDir: string };

/** Runs the client build, then patches the server bundle with resolved hydration asset paths. */
export async function runProductionBuild(input: ProductionBuildInput): Promise<void> {
	const assets = await runClientBuild(input);
	if (assets !== undefined) {
		patchServerBundle(path.resolve(input.rootDir, input.serverOutDir), assets);
	}
}
