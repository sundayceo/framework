import type { MatchableRoute } from "../runtime/types";

export type { MatchableRoute } from "../runtime/types";

/** A scanned route with its file path, route pattern, and parameters. */
export type RouteEntry = MatchableRoute & {
	filePath: string;
};

/** An error page entry mapping an HTTP status code to its source file. */
export type ErrorPageEntry = {
	status: number;
	filePath: string;
};

/** The result of scanning route files, separated into routes and error pages. */
export type ScanResult = {
	routes: RouteEntry[];
	errorPages: ErrorPageEntry[];
};

/** A route entry with a lazy module loader for use in the runtime manifest. */
export type ManifestRouteEntry = MatchableRoute & {
	load: () => Promise<Record<string, unknown>>;
};

const PARAM_PATTERN = /\[([^\]]+)\]/g;
const ROUTE_EXTENSIONS = [".tsx", ".ts"];
const TEST_PATTERN = /\.test\.[^.]+$/;
const ERROR_PAGE_PATTERN = /^(?:.*\/)?([45]\d{2})\.[^.]+$/;

const convertSegment = (segment: string): string => segment.replace(PARAM_PATTERN, ":$1");

const extractParams = (filePath: string): string[] => {
	const params: string[] = [];
	let match: RegExpExecArray | null = PARAM_PATTERN.exec(filePath);
	while (match !== null) {
		params.push(match.at(1) ?? "");
		match = PARAM_PATTERN.exec(filePath);
	}
	return params;
};

const hasDynamicSegment = (pattern: string): boolean => pattern.includes(":");

const stripExtension = (filePath: string): string => filePath.replace(/\.(tsx|ts)$/, "");

const buildPattern = (filePath: string): string => {
	const withoutExtension = stripExtension(filePath);
	const segments = withoutExtension.split("/").map(convertSegment);
	const lastSegment = segments.at(-1);

	if (lastSegment === "index") {
		segments.pop();
	}

	const joined = segments.join("/");
	return `/${joined}`;
};

const hasRouteExtension = (fp: string): boolean => ROUTE_EXTENSIONS.some((ext) => fp.endsWith(ext));

const isRouteFile = (fp: string): boolean => hasRouteExtension(fp) && !TEST_PATTERN.test(fp);

const getErrorStatus = (filePath: string): number | null => {
	const match = ERROR_PAGE_PATTERN.exec(filePath);
	const status = match?.at(1);
	if (status === undefined) {
		return null;
	}
	return Number(status);
};

/** Scans file paths to produce sorted route entries and error page entries. */
export const scanRoutes = (filePaths: string[]): ScanResult => {
	const routeFiles = filePaths.filter(isRouteFile);

	const routes: RouteEntry[] = [];
	const errorPages: ErrorPageEntry[] = [];

	for (const filePath of routeFiles) {
		const errorStatus = getErrorStatus(filePath);
		if (errorStatus !== null) {
			errorPages.push({ status: errorStatus, filePath });
		} else {
			routes.push({
				routePath: buildPattern(filePath),
				params: extractParams(filePath),
				filePath,
			});
		}
	}

	routes.sort((a, b) => {
		const isDynamicA = hasDynamicSegment(a.routePath);
		const isDynamicB = hasDynamicSegment(b.routePath);

		if (isDynamicA !== isDynamicB) {
			return isDynamicA ? 1 : -1;
		}

		return a.routePath.localeCompare(b.routePath);
	});

	return { routes, errorPages };
};
