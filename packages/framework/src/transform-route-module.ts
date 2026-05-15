function filePathToRoute(filePath: string): string {
	const withoutExtension = filePath.replace(/\.(tsx|ts)$/, "");
	const segments = withoutExtension.split("/");
	const lastSegment = segments.at(-1);

	if (lastSegment === "index") {
		segments.pop();
	}

	const joined = segments.join("/");
	return `/${joined}`;
}

const DEFINE_PATTERN = /(definePage|defineHandler)\(("[^"]*")?\)/g;

export function transformRouteModule(args: { source: string; routePath: string }): string {
	const { source, routePath } = args;
	const quoted = `"${routePath}"`;

	return source.replace(
		DEFINE_PATTERN,
		(_match, funcName: string, _existingArg: string | undefined) => {
			return `${funcName}(${quoted})`;
		},
	);
}

export function filePathToRoutePath(filePath: string): string {
	return filePathToRoute(filePath);
}
