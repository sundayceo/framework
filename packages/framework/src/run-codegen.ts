import fs from "node:fs";
import path from "node:path";

import { generateRouteMap } from "./codegen-routes";
import { generateTemplateRegistry } from "./codegen-templates";
import { generateRouteManifest } from "./generate-route-manifest";

const ROUTE_EXTENSIONS = [".tsx", ".ts"];
const TEMPLATE_EXTENSIONS = [".tsx"];

type CodegenResult = {
	declarations: string;
	manifest: string;
};

function scanDir(dir: string, extensions: string[]): string[] {
	if (!fs.existsSync(dir)) {
		return [];
	}

	return fs
		.readdirSync(dir, { recursive: true })
		.filter((f): f is string => typeof f === "string" && extensions.some((ext) => f.endsWith(ext)));
}

export function runCodegen(srcDir: string): CodegenResult {
	const templatePaths = scanDir(path.join(srcDir, "templates"), TEMPLATE_EXTENSIONS);
	const routePaths = scanDir(path.join(srcDir, "routes"), ROUTE_EXTENSIONS);

	const templateBlock = generateTemplateRegistry(templatePaths);
	const routeBlock = generateRouteMap(routePaths);
	const declarations = `export {};\n\n${templateBlock}\n${routeBlock}`;

	const manifest = generateRouteManifest({ routePaths, templatePaths });

	return { declarations, manifest };
}
