import type { RouteEntry } from "./route-scanner";

type MatchResult = {
	route: RouteEntry;
	params: Record<string, string>;
};

const normalize = (path: string): string => {
	if (path === "/") {
		return path;
	}
	return path.endsWith("/") ? path.slice(0, -1) : path;
};

const tryMatch = (url: string, route: RouteEntry): MatchResult | null => {
	const urlSegments = url.split("/").filter(Boolean);
	const patternSegments = route.pattern.split("/").filter(Boolean);

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
};

const matchRoute = (url: string, routes: RouteEntry[]): MatchResult | null => {
	const normalizedUrl = normalize(url);

	for (const route of routes) {
		const result = tryMatch(normalizedUrl, route);
		if (result !== null) {
			return result;
		}
	}

	return null;
};

export { matchRoute, type MatchResult };
