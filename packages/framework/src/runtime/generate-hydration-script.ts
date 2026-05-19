type GenerateHydrationScriptInput = {
	slotId: string;
	assetPath: string;
};

/** Generates a client-side module script that hydrates a single interactive slot. */
export function generateHydrationScript(input: GenerateHydrationScriptInput): string {
	const { slotId, assetPath } = input;

	return [
		`import HydrateSlot from "${assetPath}";`,
		`import { hydrateRoot } from "react-dom/client";`,
		`const dataEl = document.querySelector('script[data-hydrate-data="${slotId}"]');`,
		`const loaderData = dataEl ? JSON.parse(dataEl.textContent || "{}") : {};`,
		`const root = document.querySelector('[data-hydrate="${slotId}"]');`,
		`if (root) { hydrateRoot(root, HydrateSlot({ loaderData })); }`,
	].join("\n");
}
