type ServerEntryPaths = {
	appModule: string;
	routesModule: string;
};

/** Generates the server entry module that wires the app, routes, and templates into createHandler. */
export function generateServerEntry(paths: ServerEntryPaths): string {
	return [
		'import { createHandler } from "@sundayceo/framework";',
		`import { app } from "${paths.appModule}";`,
		`import { routes, templates, errorPages, hydrationManifest } from "${paths.routesModule}";`,
		"",
		"export default createHandler({ app, routes, templates, errorPages, hydrationManifest });",
	].join("\n");
}
