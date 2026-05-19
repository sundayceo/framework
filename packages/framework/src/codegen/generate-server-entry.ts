type ServerEntryPaths = {
	appModule: string;
	routesModule: string;
};

export function generateServerEntry(paths: ServerEntryPaths): string {
	return [
		'import { createHandler } from "@sundayceo/framework";',
		`import { app } from "${paths.appModule}";`,
		`import { routes, templates, errorPages, hydrationManifest } from "${paths.routesModule}";`,
		"",
		"export default createHandler({ app, routes, templates, errorPages, hydrationManifest });",
	].join("\n");
}
