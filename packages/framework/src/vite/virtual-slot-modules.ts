import path from "node:path";

import { buildSlotKey, extractSlotModules, type SlotModuleParts } from "../codegen/slot-extraction";
import { parseHydrateId } from "./hydrate-ids";

function resolveRouteDir(routePath: string, routesDir: string, filePathMap?: Record<string, string>): string {
	const filePath = filePathMap?.[routePath];
	const routeFile = filePath ?? `${routePath.replace(/^\//, "")}.tsx`;
	return path.dirname(path.join(routesDir, routeFile));
}

function rewriteImportSource(source: string, routeDir: string): string {
	return source.replace(/from\s+["'](\.[^"']+)["']/g, (_match, specifier: string) => {
		const absolute = path.resolve(routeDir, specifier);
		return `from "${absolute}"`;
	});
}

type LoadSlotInput = {
	id: string;
	routeSources: Map<string, string>;
	routesDir?: string;
	filePathMap?: Record<string, string>;
};

export type SlotLoadResult = { moduleSource: string; parts: SlotModuleParts };

/** Loads the virtual module source for a hydrate slot by extracting it from the route source. */
export function loadVirtualSlotModule(input: LoadSlotInput): SlotLoadResult | null {
	const parsed = parseHydrateId(input.id);

	if (parsed === null) {
		return null;
	}

	const source = input.routeSources.get(parsed.routePath);

	if (source === undefined) {
		return null;
	}

	const slotModules = extractSlotModules(source, parsed.routePath);
	const key = buildSlotKey(parsed.routePath, parsed.slotName);
	const slot = slotModules.get(key) ?? null;

	if (slot === null || input.routesDir === undefined) {
		return slot;
	}

	const routeDir = resolveRouteDir(parsed.routePath, input.routesDir, input.filePathMap);

	return {
		moduleSource: rewriteImportSource(slot.moduleSource, routeDir),
		parts: {
			...slot.parts,
			imports: slot.parts.imports.map((imp) => rewriteImportSource(imp, routeDir)),
		},
	};
}
