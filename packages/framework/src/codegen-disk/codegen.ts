import fs from "node:fs";
import path from "node:path";

import { codegen, type CodegenOutput } from "../codegen/build";
import { filePathToRoutePath } from "../codegen/transform-route-module";

const ROUTE_EXTENSIONS = [".tsx", ".ts"];
const TEMPLATE_EXTENSIONS = [".tsx"];

function scanDir(dir: string, extensions: string[]): string[] {
	if (!fs.existsSync(dir)) {
		return [];
	}

	return fs
		.readdirSync(dir, { recursive: true })
		.filter((f): f is string => typeof f === "string" && extensions.some((ext) => f.endsWith(ext)));
}

function readRouteSources(routesDir: string, routePaths: string[]): Record<string, string> {
	const sources: Record<string, string> = {};

	for (const filePath of routePaths) {
		const routePath = filePathToRoutePath(filePath);
		sources[routePath] = fs.readFileSync(path.join(routesDir, filePath), "utf-8");
	}

	return sources;
}

/** Reads routes and templates from the filesystem and runs code generation. */
export function codegenFromDisk(srcDir: string): CodegenOutput {
	const routePaths = scanDir(path.join(srcDir, "routes"), ROUTE_EXTENSIONS);
	const templatePaths = scanDir(path.join(srcDir, "templates"), TEMPLATE_EXTENSIONS);
	const routeSources = readRouteSources(path.join(srcDir, "routes"), routePaths);

	return codegen({ routePaths, templatePaths, routeSources });
}
