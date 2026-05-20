import { isInteractive } from "./interactivity-inference";
import { extractSlotModules } from "./slot-extraction";

type RouteInput = {
	routePath: string;
	source: string;
};

type ManifestInput = {
	routes: RouteInput[];
	importGraph: Record<string, string>;
};

/** Maps route paths to their slot names and interactivity flags. */
export type HydrationManifest = Record<string, Record<string, boolean>>;

/** Serializes a hydration manifest to a default-exporting ES module string. */
export function serializeManifest(manifest: HydrationManifest): string {
	return `export default ${JSON.stringify(manifest, null, 2)};\n`;
}

/** Builds a hydration manifest by extracting slots and checking interactivity for each route. */
export function buildHydrationManifest(input: ManifestInput): HydrationManifest {
	const { routes, importGraph } = input;

	const manifest: HydrationManifest = {};

	for (const route of routes) {
		const slotModules = extractSlotModules(route.source, route.routePath);

		if (slotModules.size > 0) {
			const entry: Record<string, boolean> = {};

			for (const [key, moduleSource] of slotModules) {
				/* v8 ignore next */
				const slotName = key.split("/").at(-1) ?? key;
				entry[slotName] = isInteractive(moduleSource, importGraph);
			}

			manifest[route.routePath] = entry;
		}
	}

	return manifest;
}
