import path from "node:path";

import { buildImportGraph, resolveFile } from "../codegen-disk/import-graph";
import { buildHydrationManifest, type HydrationManifestResult } from "../codegen/hydration-manifest";
import type { SlotModuleParts } from "../codegen/slot-module-assembly";
import { loadVirtualSlotModule } from "./virtual-slot-modules";

export const HYDRATE_PREFIX = "virtual:hydrate";

export type RouteScanResult = {
	sources: Map<string, string>;
	filePathMap: Record<string, string>;
};

export function stripNullByte(id: string): string {
	return id.replace(/^\0/, "");
}

export function parseSlotName(id: string): string | undefined {
	const bareId = id.replace(/^\0/, "").replace(/\.jsx$/, "");
	if (!bareId.startsWith(HYDRATE_PREFIX)) {
		return undefined;
	}
	const lastSlash = bareId.lastIndexOf("/");
	return lastSlash > 0 ? bareId.slice(lastSlash + 1) : undefined;
}

export function buildClientModule(parts: SlotModuleParts, slotName: string): string {
	const param = parts.hasLoaderData ? "{ loaderData }" : "";
	const lines: string[] = [
		'import { createElement } from "react";',
		'import { hydrateRoot } from "react-dom/client";',
		...parts.imports,
		"",
		`function HydrateSlot(${param}) {`,
	];

	for (const localSource of parts.locals) {
		lines.push(`  ${localSource}`);
	}

	lines.push(`  return (${parts.jsxSource});`);
	lines.push("}");
	lines.push("");
	lines.push(`const slotId = ${JSON.stringify(slotName)};`);
	lines.push(
		`const dataEl = document.querySelector('script[data-hydrate-data="' + slotId + '"]');`,
	);
	lines.push(`const loaderData = dataEl ? JSON.parse(dataEl.textContent || "{}") : {};`);
	lines.push(`const root = document.querySelector('[data-hydrate="' + slotId + '"]');`);
	lines.push(`if (root) { hydrateRoot(root, createElement(HydrateSlot, { loaderData })); }`);

	return lines.join("\n");
}

/** Returns true if the given module ID is a virtual hydrate slot module. */
export function isHydrateModuleId(id: string): boolean {
	const stripped = id.replace(/\.jsx$/, "");
	return stripped.startsWith(HYDRATE_PREFIX);
}

/** Resolves a hydrate module ID by prepending the null-byte prefix for Vite virtual modules. */
export function resolveHydrateId(id: string): string | undefined {
	const stripped = id.replace(/\.jsx$/, "");
	if (stripped.startsWith(HYDRATE_PREFIX)) {
		return `\0${stripped}.jsx`;
	}
	return undefined;
}

export function parseHydrateId(id: string): { routePath: string; slotName: string } | null {
	const stripped = id.replace(/^\0/, "").replace(/\.jsx$/, "");

	if (!stripped.startsWith(HYDRATE_PREFIX)) {
		return null;
	}

	const rest = stripped.slice(HYDRATE_PREFIX.length);
	const lastSlash = rest.lastIndexOf("/");

	if (lastSlash <= 0) {
		return null;
	}

	return {
		routePath: rest.slice(0, lastSlash),
		slotName: rest.slice(lastSlash + 1),
	};
}

/** Prepends the HYDRATE_PREFIX to a slot key from buildSlotKey. */
export function formatHydrateModuleId(slotKey: string): string {
	return `${HYDRATE_PREFIX}${slotKey}`;
}

export function loadHydrateModule(
	id: string,
	scan: RouteScanResult,
	srcDir: string,
): string | undefined {
	const bareId = stripNullByte(id);
	if (!isHydrateModuleId(bareId)) {
		return undefined;
	}
	const routesDir = path.join(srcDir, "routes");
	const result = loadVirtualSlotModule({
		id: bareId,
		routeSources: scan.sources,
		routesDir,
		filePathMap: scan.filePathMap,
	});
	if (result === null) {
		return undefined;
	}
	const slotName = parseSlotName(id);
	if (slotName === undefined) {
		return result.moduleSource;
	}
	return buildClientModule(result.parts, slotName);
}

export function computeHydrationManifest(
	scan: RouteScanResult,
	srcDir: string,
): HydrationManifestResult {
	const routesDir = path.join(srcDir, "routes");
	const routes = [...scan.sources.entries()].map(([routePath, source]) => {
		const relFile = scan.filePathMap[routePath];
		return {
			routePath,
			source,
			filePath: relFile !== undefined ? path.join(routesDir, relFile) : undefined,
		};
	});
	const importGraph = buildImportGraph(
		Object.fromEntries(scan.sources),
		routesDir,
		scan.filePathMap,
	);
	const resolveSpecifier = (specifier: string, fromFile?: string): string | undefined => {
		if (!specifier.startsWith(".")) {
			return undefined;
		}
		const fromDir = fromFile !== undefined ? path.dirname(fromFile) : routesDir;
		return resolveFile(specifier, fromDir);
	};

	return buildHydrationManifest({ routes, importGraph, resolveSpecifier });
}
