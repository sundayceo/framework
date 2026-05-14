import fs from "node:fs";
import path from "node:path";

import type { Plugin } from "vite";

import { generateDeclarations } from "./generate-declarations";
import { filePathToRoutePath, transformRouteModule } from "./transform-route-module";

const TSX_EXTENSION = ".tsx";
const PLUGIN_NAME = "sundayceo-framework";
const OUTPUT_FILE = "framework.gen.d.ts";

function scanDir(dir: string): string[] {
	if (!fs.existsSync(dir)) {
		return [];
	}

	return fs
		.readdirSync(dir, { recursive: true })
		.filter((f): f is string => typeof f === "string" && f.endsWith(TSX_EXTENSION));
}

function isWatchedPath(file: string, srcDir: string): boolean {
	const templatesDir = path.join(srcDir, "templates");
	const routesDir = path.join(srcDir, "routes");
	return file.startsWith(templatesDir) || file.startsWith(routesDir);
}

function runCodegen(srcDir: string): void {
	const templatePaths = scanDir(path.join(srcDir, "templates"));
	const routePaths = scanDir(path.join(srcDir, "routes"));
	const content = generateDeclarations({ templatePaths, routePaths });
	fs.writeFileSync(path.join(srcDir, OUTPUT_FILE), content);
}

export function frameworkPlugin(): Plugin {
	let srcDir: string;

	return {
		name: PLUGIN_NAME,

		configResolved(config) {
			srcDir = path.join(config.root, "src");
		},

		buildStart() {
			runCodegen(srcDir);
		},

		transform(code, id) {
			const routesDir = path.join(srcDir, "routes");

			if (!id.startsWith(routesDir) || !id.endsWith(TSX_EXTENSION)) {
				return undefined;
			}

			const relativePath = path.relative(routesDir, id);
			const routePath = filePathToRoutePath(relativePath);
			const transformed = transformRouteModule({ source: code, routePath });

			if (transformed === code) {
				return undefined;
			}

			return transformed;
		},

		configureServer(server) {
			server.watcher.on("add", (file: string) => {
				if (isWatchedPath(file, srcDir)) {
					runCodegen(srcDir);
				}
			});

			server.watcher.on("unlink", (file: string) => {
				if (isWatchedPath(file, srcDir)) {
					runCodegen(srcDir);
				}
			});
		},
	};
}
