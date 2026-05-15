type RouteEntry = {
	pattern: string;
	params: string[];
	filePath: string;
};

const PARAM_PATTERN = /\[([^\]]+)\]/g;
const ROUTE_EXTENSION = ".tsx";
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

const buildPattern = (filePath: string): string => {
	const withoutExtension = filePath.replace(ROUTE_EXTENSION, "");
	const segments = withoutExtension.split("/").map(convertSegment);
	const lastSegment = segments.at(-1);

	if (lastSegment === "index") {
		segments.pop();
	}

	const joined = segments.join("/");
	return `/${joined}`;
};

const isRouteFile = (fp: string): boolean =>
	fp.endsWith(ROUTE_EXTENSION) && !TEST_PATTERN.test(fp);

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

export { scanRoutes, type RouteEntry };
