import type { MatchableRoute } from "../runtime/types";

import { ERROR_PAGE_PATTERN, isRouteFile } from "./file-filters";
import { extractParamNames, GROUP_PATTERN, PARAM_PATTERN, stripExtension } from "./route-paths";

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

const CATCH_ALL_PATTERN = /\[\.\.\.([^\]]+)\]/;

const convertSegment = (segment: string): string => {
	const catchAll = CATCH_ALL_PATTERN.exec(segment);
	if (catchAll !== null) {
		/* v8 ignore next */
		return `*${catchAll.at(1) ?? ""}`;
	}
	return segment.replace(PARAM_PATTERN, ":$1");
};

const hasDynamicSegment = (pattern: string): boolean => pattern.includes(":");

const hasCatchAll = (pattern: string): boolean => pattern.includes("*");

const isGroupSegment = (segment: string): boolean => GROUP_PATTERN.test(segment);

const buildPattern = (filePath: string): string => {
	const withoutExtension = stripExtension(filePath);
	const segments = withoutExtension
		.split("/")
		.filter((seg) => !isGroupSegment(seg))
		.map(convertSegment);
	const lastSegment = segments.at(-1);

	if (lastSegment === "index") {
		segments.pop();
	}

	const joined = segments.join("/");
	return `/${joined}`;
};

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
				params: extractParamNames(filePath),
				filePath,
			});
		}
	}

	routes.sort((a, b) => {
		const isCatchAllA = hasCatchAll(a.routePath);
		const isCatchAllB = hasCatchAll(b.routePath);

		if (isCatchAllA !== isCatchAllB) {
			return isCatchAllA ? 1 : -1;
		}

		const isDynamicA = hasDynamicSegment(a.routePath);
		const isDynamicB = hasDynamicSegment(b.routePath);

		if (isDynamicA !== isDynamicB) {
			return isDynamicA ? 1 : -1;
		}

		return a.routePath.localeCompare(b.routePath);
	});

	return { routes, errorPages };
};
