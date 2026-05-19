import { generateRouteMap } from "./codegen-routes";
import { generateTemplateRegistry } from "./codegen-templates";
import { generateRouteManifest } from "./generate-route-manifest";
import { buildHydrationManifest, type HydrationManifest } from "./hydration-manifest";

/** Input paths and optional route sources for code generation. */
export type CodegenInput = {
	routePaths: string[];
	templatePaths: string[];
	routeSources?: Record<string, string>;
};

/** Generated type declarations and route manifest strings. */
export type CodegenOutput = {
	declarations: string;
	manifest: string;
};

/** Generates route/template type declarations and a route manifest from the given input. */
export function codegen(input: CodegenInput): CodegenOutput {
	const { routePaths, templatePaths, routeSources } = input;

	const templateBlock = generateTemplateRegistry(templatePaths);
	const routeBlock = generateRouteMap(routePaths);
	const declarations = `export {};\n\n${templateBlock}\n${routeBlock}`;

	let hydrationManifest: HydrationManifest | undefined;
	if (routeSources !== undefined) {
		const routes = Object.entries(routeSources).map(([routePath, source]) => ({
			routePath,
			source,
		}));
		hydrationManifest = buildHydrationManifest({ routes, importGraph: {} });
	}

	const manifest = generateRouteManifest({ routePaths, templatePaths, hydrationManifest });

	return { declarations, manifest };
}
