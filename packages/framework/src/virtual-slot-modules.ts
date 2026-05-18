import { extractSlotModules } from "./slot-extraction";

const HYDRATE_PREFIX = "virtual:hydrate";

export function isHydrateModuleId(id: string): boolean {
	return id.startsWith(HYDRATE_PREFIX);
}

export function resolveHydrateId(id: string): string | undefined {
	if (isHydrateModuleId(id)) {
		return `\0${id}`;
	}
	return undefined;
}

function parseHydrateId(id: string): { routePath: string; slotName: string } | null {
	const stripped = id.replace(/^\0/, "");

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

export function loadVirtualSlotModule(
	id: string,
	routeSources: Map<string, string>,
): string | null {
	const parsed = parseHydrateId(id);

	if (parsed === null) {
		return null;
	}

	const source = routeSources.get(parsed.routePath);

	if (source === undefined) {
		return null;
	}

	const slotModules = extractSlotModules(source, parsed.routePath);
	const key = `${HYDRATE_PREFIX}${parsed.routePath}/${parsed.slotName}`;

	return slotModules.get(key) ?? null;
}
