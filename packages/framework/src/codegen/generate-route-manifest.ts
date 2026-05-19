import type { HydrationManifest } from "./hydration-manifest";
import { scanRoutes } from "./route-scanner";

type GenerateRouteManifestInput = {
	routePaths: string[];
	templatePaths: string[];
	hydrationManifest?: HydrationManifest;
};

const stripExtension = (filePath: string): string => filePath.replace(/\.(tsx|ts)$/, "");

function formatParams(params: string[]): string {
	if (params.length === 0) {
		return "[]";
	}
	return `[${params.map((p) => `"${p}"`).join(", ")}]`;
}

/** Generates a routes.gen.ts module with route, template, error page, and hydration exports. */
export function generateRouteManifest(input: GenerateRouteManifestInput): string {
	const { routes: entries, errorPages } = scanRoutes(input.routePaths);

	const routeLines = entries.map(
		(entry) =>
			`  { routePath: "${entry.routePath}", params: ${formatParams(entry.params)}, loadModule: () => import("./routes/${stripExtension(entry.filePath)}") },`,
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

	const errorPageLines = errorPages.map(
		(entry) => `  ${entry.status}: () => import("./routes/${stripExtension(entry.filePath)}"),`,
	);

	const hydrationLines =
		input.hydrationManifest !== undefined ? JSON.stringify(input.hydrationManifest, null, 2) : "{}";

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
		"export const errorPages = {",
		...errorPageLines,
		"};",
		"",
		`export const hydrationManifest = ${hydrationLines};`,
		"",
	];

	return lines.join("\n");
}
