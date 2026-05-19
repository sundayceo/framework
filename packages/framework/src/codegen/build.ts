import { generateRouteMap } from "./codegen-routes";
import { generateTemplateRegistry } from "./codegen-templates";
import { generateRouteManifest } from "./generate-route-manifest";

export type CodegenInput = {
	routePaths: string[];
	templatePaths: string[];
};

export type CodegenOutput = {
	declarations: string;
	manifest: string;
};

export function codegen(input: CodegenInput): CodegenOutput {
	const { routePaths, templatePaths } = input;

	const templateBlock = generateTemplateRegistry(templatePaths);
	const routeBlock = generateRouteMap(routePaths);
	const declarations = `export {};\n\n${templateBlock}\n${routeBlock}`;

	const manifest = generateRouteManifest({ routePaths, templatePaths });

	return { declarations, manifest };
}
