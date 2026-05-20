export type SlotModuleParts = {
	imports: string[];
	hasLoaderData: boolean;
	locals: string[];
	jsxSource: string;
};

export function assembleSlotModule(parts: SlotModuleParts): string {
	const lines: string[] = [
		'import React from "react";',
		...parts.imports,
		"",
		`export default function HydrateSlot(${parts.hasLoaderData ? "{ loaderData }" : ""}) {`,
	];

	for (const localSource of parts.locals) {
		lines.push(`  ${localSource}`);
	}

	lines.push(`  return (${parts.jsxSource});`);
	lines.push("}");

	return lines.join("\n");
}
