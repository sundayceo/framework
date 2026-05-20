import fs from "node:fs";
import path from "node:path";

import { codegen, type CodegenOutput } from "../codegen/build";
import { ROUTE_EXTENSIONS } from "../codegen/file-filters";
import { filePathToRoutePath } from "../codegen/transform-route-module";
import { buildImportGraph, resolveFile } from "./import-graph";

const TEMPLATE_EXTENSIONS = [".tsx"];

function scanDir(dir: string, extensions: string[]): string[] {
	if (!fs.existsSync(dir)) {
		return [];
	}

	return fs
		.readdirSync(dir, { recursive: true })
		.filter((f): f is string => typeof f === "string" && extensions.some((ext) => f.endsWith(ext)));
}

type RouteSourceResult = {
	sources: Record<string, string>;
	filePathMap: Record<string, string>;
};

function readRouteSources(routesDir: string, routePaths: string[]): RouteSourceResult {
	const sources: Record<string, string> = {};
	const filePathMap: Record<string, string> = {};

	for (const filePath of routePaths) {
		const routePath = filePathToRoutePath(filePath);
		sources[routePath] = fs.readFileSync(path.join(routesDir, filePath), "utf-8");
		filePathMap[routePath] = filePath;
	}

	return { sources, filePathMap };
}

/** Reads routes and templates from the filesystem and runs code generation. */
export function codegenFromDisk(srcDir: string): CodegenOutput {
	const routesDir = path.join(srcDir, "routes");
	const routePaths = scanDir(routesDir, ROUTE_EXTENSIONS);
	const templatePaths = scanDir(path.join(srcDir, "templates"), TEMPLATE_EXTENSIONS);
	const { sources: routeSources, filePathMap } = readRouteSources(routesDir, routePaths);
	const importGraph = buildImportGraph(routeSources, routesDir, filePathMap);

	const absoluteFilePathMap: Record<string, string> = {};
	for (const [routePath, relFile] of Object.entries(filePathMap)) {
		absoluteFilePathMap[routePath] = path.join(routesDir, relFile);
	}

	const resolveSpecifier = (specifier: string, fromFile?: string): string | undefined => {
		if (!specifier.startsWith(".")) {
			return undefined;
		}
		const fromDir = fromFile !== undefined ? path.dirname(fromFile) : routesDir;
		return resolveFile(specifier, fromDir);
	};

	return codegen({ routePaths, templatePaths, routeSources, importGraph, resolveSpecifier, filePathMap: absoluteFilePathMap });
}
