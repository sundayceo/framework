import { scanRoutes } from "./route-scanner";

type GenerateRouteManifestInput = {
	routePaths: string[];
	templatePaths: string[];
};

const stripExtension = (filePath: string): string => filePath.replace(/\.(tsx|ts)$/, "");

function formatParams(params: string[]): string {
	if (params.length === 0) {
		return "[]";
	}
	return `[${params.map((p) => `"${p}"`).join(", ")}]`;
}

export function generateRouteManifest(input: GenerateRouteManifestInput): string {
	const entries = scanRoutes(input.routePaths);

	const routeLines = entries.map(
		(entry) =>
			`  { pattern: "${entry.pattern}", params: ${formatParams(entry.params)}, load: () => import("./routes/${stripExtension(entry.filePath)}") },`,
	);

	const templateEntries = input.templatePaths
		.filter((f) => f.endsWith(".tsx"))
		.map((f) => ({
			name: f.replace(/\.tsx$/, ""),
			importPath: stripExtension(f),
		}))
		.sort((a, b) => a.name.localeCompare(b.name));

	const templateLines = templateEntries.map(
		(t) => `  ${t.name}: () => import("./templates/${t.importPath}"),`,
	);

	const lines = [
		"// src/routes.gen.ts (generated — do not edit)",
		"export const routes = [",
		...routeLines,
		"];",
		"",
		"export const templates = {",
		...templateLines,
		"};",
		"",
	];

	return lines.join("\n");
}
