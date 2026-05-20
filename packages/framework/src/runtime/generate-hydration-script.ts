type GenerateHydrationScriptInput = {
	slotId: string;
	assetPath: string;
};

/** Generates a client-side module script that triggers hydration for a single interactive slot. */
export function generateHydrationScript(input: GenerateHydrationScriptInput): string {
	const { assetPath } = input;

	return `import "${assetPath}";`;
}
