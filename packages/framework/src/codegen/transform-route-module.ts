const DEFINE_PATTERN = /(definePage|defineHandler)\(("[^"]*")?\)/g;
const DEFINE_ERROR_PAGE_PATTERN = /(defineErrorPage)\((\d+)?\)/g;
const ERROR_STATUS_PATTERN = /^\/([45]\d{2})$/;
const GROUP_PATTERN = /^\(.*\)$/;

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

/** Injects the route path into definePage/defineHandler/defineErrorPage calls. */
export function transformRouteModule(args: { source: string; routePath: string }): string {
	const { source, routePath } = args;
	const quoted = `"${routePath}"`;

	const statusMatch = ERROR_STATUS_PATTERN.exec(routePath);
	if (statusMatch !== null) {
		/* v8 ignore next */
		const status = statusMatch.at(1) ?? "";
		return source.replace(
			DEFINE_ERROR_PAGE_PATTERN,
			(_match, funcName: string) => `${funcName}(${status})`,
		);
	}

	return source.replace(DEFINE_PATTERN, (_match, funcName: string) => `${funcName}(${quoted})`);
}

/** Converts a file path (e.g. "blog/[slug].tsx") to a route path (e.g. "/blog/[slug]"). */
export function filePathToRoutePath(filePath: string): string {
	return filePathToRoute(filePath);
}
