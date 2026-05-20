export const GROUP_PATTERN = /^\(.*\)$/;
export const PARAM_PATTERN = /\[([^\]]+)\]/g;
export const CATCH_ALL_PREFIX = "...";

/** Strips .tsx/.ts extension from a file path. */
export const stripExtension = (filePath: string): string => filePath.replace(/\.(tsx|ts)$/, "");

/** Converts a file path to a URL route pattern (e.g. "blog/[slug].tsx" → "/blog/[slug]"). */
export function filePathToRoute(filePath: string): string {
	const withoutExtension = filePath.replace(/\.(tsx|ts)$/, "");
	const segments = withoutExtension.split("/").filter((seg) => !GROUP_PATTERN.test(seg));
	const lastSegment = segments.at(-1);

	if (lastSegment === "index") {
		segments.pop();
	}

	const joined = segments.join("/");
	return `/${joined}`;
}

/** Extracts parameter names from a route or file path containing [param] segments. */
export function extractParamNames(route: string): string[] {
	const params: string[] = [];
	let match: RegExpExecArray | null = PARAM_PATTERN.exec(route);
	while (match !== null) {
		/* v8 ignore next */
		const raw = match.at(1) ?? "";
		params.push(raw.startsWith(CATCH_ALL_PREFIX) ? raw.slice(CATCH_ALL_PREFIX.length) : raw);
		match = PARAM_PATTERN.exec(route);
	}
	return params;
}
