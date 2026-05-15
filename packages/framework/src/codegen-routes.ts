const PARAM_PATTERN = /\[([^\]]+)\]/g;
const ROUTE_EXTENSION = ".tsx";
const TEST_PATTERN = /\.test\.[^.]+$/;

function filePathToRoute(filePath: string): string {
	const withoutExtension = filePath.replace(/\.tsx$/, "");
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
		.filter((f) => f.endsWith(ROUTE_EXTENSION) && !TEST_PATTERN.test(f))
		.map((f) => {
			const route = filePathToRoute(f);
			const params = extractParams(route);
			return { route, params };
		})
		.sort((a, b) => a.route.localeCompare(b.route));

	const lines = [
		'declare module "@sundayceo/framework" {',
		"  interface RouteMap {",
		...routes.map((r) => `    "${r.route}": ${formatParamType(r.params)};`),
		"  }",
		"}",
		"",
	];

	return lines.join("\n");
}
