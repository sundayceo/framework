import type { MatchableRoute } from "./types";

/** Result of a successful route match, containing the matched route and extracted params. */
export type MatchResult<T extends MatchableRoute = MatchableRoute> = {
	route: T;
	params: Record<string, string>;
};

const normalize = (path: string): string => {
	if (path === "/") {
		return path;
	}
	return path.endsWith("/") ? path.slice(0, -1) : path;
};

function tryMatch<T extends MatchableRoute>(url: string, route: T): MatchResult<T> | null {
	const urlSegments = url.split("/").filter(Boolean);
	const patternSegments = route.routePath.split("/").filter(Boolean);

	if (urlSegments.length !== patternSegments.length) {
		return null;
	}

	const params: Record<string, string> = {};

	for (let i = 0; i < patternSegments.length; i++) {
		const patternSeg = patternSegments.at(i) ?? "";
		const urlSeg = urlSegments.at(i) ?? "";

		if (patternSeg.startsWith(":")) {
			params[patternSeg.slice(1)] = urlSeg;
		} else if (patternSeg !== urlSeg) {
			return null;
		}
	}

	return { route, params };
}

/** Matches a URL pathname against a list of routes, returning the first match or null. */
export function matchRoute<T extends MatchableRoute>(
	url: string,
	routes: T[],
): MatchResult<T> | null {
	const normalizedUrl = normalize(url);

	for (const route of routes) {
		const result = tryMatch(normalizedUrl, route);
		if (result !== null) {
			return result;
		}
	}

	return null;
}
