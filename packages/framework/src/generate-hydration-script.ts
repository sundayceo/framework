type GenerateHydrationScriptInput = {
	slotId: string;
	routePath: string;
};

export function generateHydrationScript(input: GenerateHydrationScriptInput): string {
	const { slotId, routePath } = input;

	return [
		`(async () => {`,
		`const root = document.querySelector('[data-hydrate="${slotId}"]');`,
		`const dataEl = document.querySelector('script[data-hydrate-data="${slotId}"]');`,
		`const loaderData = dataEl ? JSON.parse(dataEl.textContent || "{}") : {};`,
		`const mod = await import("${routePath}");`,
		`const { hydrateRoot } = await import("react-dom/client");`,
		`const slots = mod.defineSlots({ loaderData });`,
		`const slotContent = slots["${slotId}"];`,
		`if (root && slotContent) { hydrateRoot(root, slotContent); }`,
		`})();`,
	].join("\n");
}
