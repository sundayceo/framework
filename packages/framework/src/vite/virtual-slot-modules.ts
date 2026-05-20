import path from "node:path";

import { extractSlotModules } from "../codegen/slot-extraction";

const HYDRATE_PREFIX = "virtual:hydrate";

function parseHydrateId(id: string): { routePath: string; slotName: string } | null {
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

type RewriteInput = {
	moduleSource: string;
	routePath: string;
	routesDir: string;
	filePathMap?: Record<string, string>;
};

function rewriteRelativeImports(input: RewriteInput): string {
	const filePath = input.filePathMap?.[input.routePath];
	const routeFile = filePath ?? `${input.routePath.replace(/^\//, "")}.tsx`;
	const routeDir = path.dirname(path.join(input.routesDir, routeFile));

	return input.moduleSource.replace(/from\s+["'](\.[^"']+)["']/g, (_match, specifier: string) => {
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

/** Loads the virtual module source for a hydrate slot by extracting it from the route source. */
export function loadVirtualSlotModule(input: LoadSlotInput): string | null {
	const parsed = parseHydrateId(input.id);

	if (parsed === null) {
		return null;
	}

	const source = input.routeSources.get(parsed.routePath);

	if (source === undefined) {
		return null;
	}

	const slotModules = extractSlotModules(source, parsed.routePath);
	const key = `${HYDRATE_PREFIX}${parsed.routePath}/${parsed.slotName}`;
	const moduleSource = slotModules.get(key) ?? null;

	if (moduleSource === null || input.routesDir === undefined) {
		return moduleSource;
	}

	return rewriteRelativeImports({
		moduleSource,
		routePath: parsed.routePath,
		routesDir: input.routesDir,
		filePathMap: input.filePathMap,
	});
}
