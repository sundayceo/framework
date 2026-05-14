import { generateRouteMap } from "./codegen-routes";
import { generateTemplateRegistry } from "./codegen-templates";

type GenerateDeclarationsInput = {
	templatePaths: string[];
	routePaths: string[];
};

export function generateDeclarations(input: GenerateDeclarationsInput): string {
	const templateBlock = generateTemplateRegistry(input.templatePaths);
	const routeBlock = generateRouteMap(input.routePaths);
	return `export {};\n\n${templateBlock}\n${routeBlock}`;
}
