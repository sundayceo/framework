type GenerateHydrationScriptInput = {
	slotId: string;
	assetPath: string;
};

/** Generates a client-side module script that hydrates a single interactive slot. */
export function generateHydrationScript(input: GenerateHydrationScriptInput): string {
	const { slotId, assetPath } = input;

	return [
		`import { createElement } from "react";`,
		`import { hydrateRoot } from "react-dom/client";`,
		`import HydrateSlot from "${assetPath}";`,
		`const dataEl = document.querySelector('script[data-hydrate-data="${slotId}"]');`,
		`const loaderData = dataEl ? JSON.parse(dataEl.textContent || "{}") : {};`,
		`const root = document.querySelector('[data-hydrate="${slotId}"]');`,
		`if (root) { hydrateRoot(root, createElement(HydrateSlot, { loaderData })); }`,
	].join("\n");
}
