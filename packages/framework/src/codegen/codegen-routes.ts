import { ERROR_PAGE_PATTERN, hasRouteExtension, isTestFile } from "./file-filters";
import { extractParamNames, filePathToRoute } from "./route-paths";

function formatParamType(params: string[]): string {
	if (params.length === 0) {
		return "{}";
	}
	return `{ ${params.map((p) => `"${p}": string`).join("; ")} }`;
}

/** Generates a TypeScript RouteMap declaration from route file paths. */
export function generateRouteMap(filePaths: string[]): string {
	const routes = filePaths
		.filter((f) => hasRouteExtension(f) && !isTestFile(f) && !ERROR_PAGE_PATTERN.test(f))
		.map((f) => {
			const route = filePathToRoute(f);
			const params = extractParamNames(route);
			return { route, params };
		})
		.sort((a, b) => a.route.localeCompare(b.route));

	const lines = [
		'declare module "@sundayceo/framework" {',
		"\tinterface RouteMap {",
		...routes.map((r) => `\t\t"${r.route}": ${formatParamType(r.params)};`),
		"\t}",
		"}",
		"",
	];

	return lines.join("\n");
}
