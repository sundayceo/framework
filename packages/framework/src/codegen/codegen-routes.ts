const PARAM_PATTERN = /\[([^\]]+)\]/g;
const CATCH_ALL_PREFIX = "...";
const GROUP_PATTERN = /^\(.*\)$/;
const ROUTE_EXTENSIONS = [".tsx", ".ts"];
const TEST_PATTERN = /\.test\.[^.]+$/;
const ERROR_PAGE_PATTERN = /^(?:.*\/)?[45]\d{2}\.[^.]+$/;

/** Converts a file path to a URL route pattern. */
function filePathToRoute(filePath: string): string {
	const withoutExtension = filePath.replace(/\.(tsx|ts)$/, "");
	const segments = withoutExtension.split("/").filter((seg) => !GROUP_PATTERN.test(seg));
	const lastSegment = segments.at(-1);

	if (lastSegment === "index") {
		segments.pop();
	}

	const joined = segments.join("/");
	return `/${joined}`;
}

type ParamEntry = { name: string; isCatchAll: boolean };

function extractParams(route: string): ParamEntry[] {
	const params: ParamEntry[] = [];
	let match: RegExpExecArray | null = PARAM_PATTERN.exec(route);
	while (match !== null) {
		const raw = match.at(1) ?? "";
		const isCatchAll = raw.startsWith(CATCH_ALL_PREFIX);
		params.push({ name: isCatchAll ? raw.slice(CATCH_ALL_PREFIX.length) : raw, isCatchAll });
		match = PARAM_PATTERN.exec(route);
	}
	return params;
}

function formatParamType(params: ParamEntry[]): string {
	if (params.length === 0) {
		return "{}";
	}
	return `{ ${params.map((p) => `${p.name}: string`).join("; ")} }`;
}

/** Generates a TypeScript RouteMap declaration from route file paths. */
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
