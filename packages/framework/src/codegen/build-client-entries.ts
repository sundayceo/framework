type HydrationManifest = Record<string, Record<string, boolean>>;

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
