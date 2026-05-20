import { generateRouteMap } from "./codegen-routes";
import { generateTemplateRegistry } from "./codegen-templates";
import { generateRouteManifest } from "./generate-route-manifest";
import { buildHydrationManifest, type HydrationManifest } from "./hydration-manifest";
import { extractSlotModules } from "./slot-extraction";

/** Input paths and optional route sources for code generation. */
export type CodegenInput = {
	routePaths: string[];
	templatePaths: string[];
	routeSources?: Record<string, string>;
	importGraph?: Record<string, string>;
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
	slotModules: Map<string, string>,
): ClientEntry[] {
	return Object.entries(slots)
		.filter(([, isInteractive]) => isInteractive)
		.map(([slotName]) => ({
			slotName,
			moduleSource: slotModules.get(`virtual:hydrate${routePath}/${slotName}`),
		}))
		.filter(
			(entry): entry is { slotName: string; moduleSource: string } =>
				entry.moduleSource !== undefined,
		)
		.map(({ slotName, moduleSource }) => ({ routePath, slotName, moduleSource }));
}

/** @internal Visible for testing. */
export function buildClientEntries(
	routeSources: Record<string, string>,
	hydrationManifest: HydrationManifest,
): ClientEntry[] {
	return Object.entries(hydrationManifest).flatMap(([routePath, slots]) => {
		const source = routeSources[routePath];
		if (source === undefined) {
			return [];
		}

		const slotModules = extractSlotModules(source, routePath);
		return extractInteractiveSlots(routePath, slots, slotModules);
	});
}

/** Generates route/template type declarations and a route manifest from the given input. */
export function codegen(input: CodegenInput): CodegenOutput {
	const { routePaths, templatePaths, routeSources, importGraph = {} } = input;

	const templateBlock = generateTemplateRegistry(templatePaths);
	const routeBlock = generateRouteMap(routePaths);
	const declarations = `export {};\n\n${templateBlock}\n${routeBlock}`;

	let hydrationManifest: HydrationManifest | undefined;
	let clientEntries: ClientEntry[] = [];

	if (routeSources !== undefined) {
		const routes = Object.entries(routeSources).map(([routePath, source]) => ({
			routePath,
			source,
		}));
		hydrationManifest = buildHydrationManifest({ routes, importGraph });
		clientEntries = buildClientEntries(routeSources, hydrationManifest);
	}

	const manifest = generateRouteManifest({ routePaths, templatePaths, hydrationManifest });

	return { declarations, manifest, clientEntries };
}
