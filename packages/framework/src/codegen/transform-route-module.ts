import { filePathToRoute } from "./route-paths";

const DEFINE_PATTERN = /(definePage|defineHandler)\(("[^"]*")?\)/g;
const DEFINE_ERROR_PAGE_PATTERN = /(defineErrorPage)\((\d+)?\)/g;
const ERROR_STATUS_PATTERN = /^\/([45]\d{2})$/;

/** Injects the route path into definePage/defineHandler/defineErrorPage calls. */
export function transformRouteModule(args: { source: string; routePath: string }): string {
	const { source, routePath } = args;
	const quoted = `"${routePath}"`;

	const statusMatch = ERROR_STATUS_PATTERN.exec(routePath);
	if (statusMatch !== null) {
		const status = statusMatch[1];
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
