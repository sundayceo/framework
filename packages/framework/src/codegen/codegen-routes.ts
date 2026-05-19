const PARAM_PATTERN = /\[([^\]]+)\]/g;
const ROUTE_EXTENSIONS = [".tsx", ".ts"];
const TEST_PATTERN = /\.test\.[^.]+$/;
const ERROR_PAGE_PATTERN = /^(?:.*\/)?[45]\d{2}\.[^.]+$/;

function filePathToRoute(filePath: string): string {
	const withoutExtension = filePath.replace(/\.(tsx|ts)$/, "");
	const segments = withoutExtension.split("/");
	const lastSegment = segments.at(-1);

	if (lastSegment === "index") {
		segments.pop();
	}

	const joined = segments.join("/");
	return `/${joined}`;
}

function extractParams(route: string): string[] {
	const params: string[] = [];
	let match: RegExpExecArray | null = PARAM_PATTERN.exec(route);
	while (match !== null) {
		params.push(match.at(1) ?? "");
		match = PARAM_PATTERN.exec(route);
	}
	return params;
}

function formatParamType(params: string[]): string {
	if (params.length === 0) {
		return "{}";
	}
	return `{ ${params.map((p) => `${p}: string`).join("; ")} }`;
}

export function generateRouteMap(filePaths: string[]): string {
	const routes = filePaths
		.filter(
			(f) =>
				ROUTE_EXTENSIONS.some((ext) => f.endsWith(ext)) &&
				!TEST_PATTERN.test(f) &&
				!ERROR_PAGE_PATTERN.test(f),
		)
		.map((f) => {
			const route = filePathToRoute(f);
			const params = extractParams(route);
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
