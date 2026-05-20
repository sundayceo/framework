import { generateRouteMap } from "./codegen-routes";
import { generateTemplateRegistry } from "./codegen-templates";
import { generateRouteManifest } from "./generate-route-manifest";
import { buildHydrationManifest, type HydrationManifest } from "./hydration-manifest";
import type { SpecifierResolver } from "./interactivity-inference";
import { buildSlotKey, type SlotModule } from "./slot-extraction";

/** Input paths and optional route sources for code generation. */
export type CodegenInput = {
	routePaths: string[];
	templatePaths: string[];
	routeSources?: Record<string, string>;
	importGraph?: Record<string, string>;
	resolveSpecifier?: SpecifierResolver;
	filePathMap?: Record<string, string>;
};

/** A structured client entry for an interactive slot. */
export type ClientEntry = {
	routePath: string;
	slotName: string;
	moduleSource: string;
};

/** Generated type declarations, route manifest, and client entries. */
export type CodegenOutput = {
	declarations: string;
	manifest: string;
	clientEntries: ClientEntry[];
};

function extractInteractiveSlots(
	routePath: string,
	slots: Record<string, boolean>,
	slotModules: Map<string, SlotModule>,
): ClientEntry[] {
	return Object.entries(slots)
		.filter(([, isInteractive]) => isInteractive)
		.map(([slotName]) => ({
			slotName,
			slot: slotModules.get(buildSlotKey(routePath, slotName)),
		}))
		.filter((entry): entry is { slotName: string; slot: SlotModule } => entry.slot !== undefined)
		.map(({ slotName, slot }) => ({ routePath, slotName, moduleSource: slot.moduleSource }));
}

/** @internal Visible for testing. */
export function buildClientEntries(
	hydrationManifest: HydrationManifest,
	slotModulesByRoute: Map<string, Map<string, SlotModule>>,
): ClientEntry[] {
	return Object.entries(hydrationManifest).flatMap(([routePath, slots]) => {
		const slotModules = slotModulesByRoute.get(routePath);
		if (slotModules === undefined) {
			return [];
		}

		return extractInteractiveSlots(routePath, slots, slotModules);
	});
}

/** Generates route/template type declarations and a route manifest from the given input. */
export function codegen(input: CodegenInput): CodegenOutput {
	const { routePaths, templatePaths, routeSources, importGraph = {}, resolveSpecifier, filePathMap } = input;

	const templateBlock = generateTemplateRegistry(templatePaths);
	const routeBlock = generateRouteMap(routePaths);
	const declarations = `export {};\n\n${templateBlock}\n${routeBlock}`;

	let hydrationManifest: HydrationManifest | undefined;
	let clientEntries: ClientEntry[] = [];

	if (routeSources !== undefined) {
		const routes = Object.entries(routeSources).map(([routePath, source]) => ({
			routePath,
			source,
			filePath: filePathMap?.[routePath],
		}));
		const result = buildHydrationManifest({ routes, importGraph, resolveSpecifier });
		hydrationManifest = result.manifest;
		clientEntries = buildClientEntries(hydrationManifest, result.slotModulesByRoute);
	}

	const manifest = generateRouteManifest({ routePaths, templatePaths, hydrationManifest });

	return { declarations, manifest, clientEntries };
}
