import { isInteractive, type SpecifierResolver } from "./interactivity-inference";
import { extractSlotModules, type SlotModule } from "./slot-extraction";

type RouteInput = {
	routePath: string;
	source: string;
	filePath?: string;
};

type ManifestInput = {
	routes: RouteInput[];
	importGraph: Record<string, string>;
	resolveSpecifier?: SpecifierResolver;
};

/** Maps route paths to their slot names and interactivity flags. */
export type HydrationManifest = Record<string, Record<string, boolean>>;

/** Result of building a hydration manifest, including the extracted slot modules. */
export type HydrationManifestResult = {
	manifest: HydrationManifest;
	slotModulesByRoute: Map<string, Map<string, SlotModule>>;
};

/** Serializes a hydration manifest to a default-exporting ES module string. */
export function serializeManifest(manifest: HydrationManifest): string {
	return `export default ${JSON.stringify(manifest, null, 2)};\n`;
}

/** Builds a hydration manifest by extracting slots and checking interactivity for each route. */
export function buildHydrationManifest(input: ManifestInput): HydrationManifestResult {
	const { routes, importGraph, resolveSpecifier } = input;

	const manifest: HydrationManifest = {};
	const slotModulesByRoute = new Map<string, Map<string, SlotModule>>();

	for (const route of routes) {
		const slotModules = extractSlotModules(route.source, route.routePath);

		if (slotModules.size > 0) {
			slotModulesByRoute.set(route.routePath, slotModules);
			const entry: Record<string, boolean> = {};

			const routeResolver: SpecifierResolver | undefined =
				resolveSpecifier !== undefined && route.filePath !== undefined
					? (specifier, fromFile) => resolveSpecifier(specifier, fromFile ?? route.filePath)
					: resolveSpecifier;

			for (const [key, slot] of slotModules) {
				const slotName = key.split("/").at(-1) ?? key;
				entry[slotName] = isInteractive(slot.moduleSource, importGraph, routeResolver);
			}

			manifest[route.routePath] = entry;
		}
	}

	return { manifest, slotModulesByRoute };
}
