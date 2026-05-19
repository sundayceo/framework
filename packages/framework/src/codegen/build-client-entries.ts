type HydrationManifest = Record<string, Record<string, boolean>>;

/** Returns virtual module IDs for all interactive slots in the hydration manifest. */
export function buildClientEntries(manifest: HydrationManifest): string[] {
	const entries: string[] = [];

	for (const [routePath, slots] of Object.entries(manifest)) {
		for (const [slotName, interactive] of Object.entries(slots)) {
			if (interactive) {
				entries.push(`virtual:hydrate${routePath}/${slotName}`);
			}
		}
	}

	return entries;
}
