type MatchableRoute = {
	pattern: string;
	params: string[];
};

type RouteEntry = MatchableRoute & {
	filePath: string;
};

type ManifestRouteEntry = MatchableRoute & {
	load: () => Promise<Record<string, unknown>>;
};

const PARAM_PATTERN = /\[([^\]]+)\]/g;
const ROUTE_EXTENSIONS = [".tsx", ".ts"];
const TEST_PATTERN = /\.test\.[^.]+$/;

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

const scanRoutes = (filePaths: string[]): RouteEntry[] => {
	const routeFiles = filePaths.filter(isRouteFile);

	const entries = routeFiles.map(
		(filePath): RouteEntry => ({
			pattern: buildPattern(filePath),
			params: extractParams(filePath),
			filePath,
		}),
	);

	return entries.sort((a, b) => {
		const isDynamicA = hasDynamicSegment(a.pattern);
		const isDynamicB = hasDynamicSegment(b.pattern);

		if (isDynamicA !== isDynamicB) {
			return isDynamicA ? 1 : -1;
		}

		return a.pattern.localeCompare(b.pattern);
	});
};

export { scanRoutes, type MatchableRoute, type ManifestRouteEntry, type RouteEntry };
