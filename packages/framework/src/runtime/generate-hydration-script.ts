/** Generates a client-side module script that triggers hydration for a single interactive slot. */
export function generateHydrationScript(assetPath: string): string {
	return `import "${assetPath}";`;
}
