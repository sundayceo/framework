type ServerEntryPaths = {
	appModule: string;
	routesModule: string;
	hydrationAssets?: Record<string, Record<string, string>>;
	shouldUsePlaceholder?: boolean;
};

/** Generates the server entry module that wires the app, routes, and templates into createHandler. */
export function generateServerEntry(paths: ServerEntryPaths): string {
	const lines = [
		'import { createHandler } from "@sundayceo/framework";',
		`import { app } from "${paths.appModule}";`,
		`import { routes, templates, errorPages, hydrationManifest } from "${paths.routesModule}";`,
		"",
	];

	if (paths.hydrationAssets !== undefined) {
		lines.push(`const hydrationAssets = ${JSON.stringify(paths.hydrationAssets)};`);
		lines.push("");
		lines.push(
			"export default createHandler({ app, routes, templates, errorPages, hydrationManifest, hydrationAssets });",
		);
	} else if (paths.shouldUsePlaceholder === true) {
		lines.push("const hydrationAssets = \"__SUNDAYCEO_HYDRATION_ASSETS__\";");
		lines.push("");
		lines.push(
			"export default createHandler({ app, routes, templates, errorPages, hydrationManifest, hydrationAssets });",
		);
	} else {
		lines.push(
			"export default createHandler({ app, routes, templates, errorPages, hydrationManifest });",
		);
	}

	return lines.join("\n");
}
