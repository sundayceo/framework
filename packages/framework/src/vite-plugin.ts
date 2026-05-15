import fs from "node:fs";
import path from "node:path";

import type { Plugin } from "vite";

import { runCodegen } from "./run-codegen";
import { filePathToRoutePath, transformRouteModule } from "./transform-route-module";
import { createDevMiddleware } from "./vite-dev-middleware";

const ROUTE_EXTENSIONS = [".tsx", ".ts"];
const PLUGIN_NAME = "sundayceo-framework";
const OUTPUT_FILE = "framework.gen.d.ts";
const MANIFEST_FILE = "routes.gen.ts";

function isWatchedPath(file: string, srcDir: string): boolean {
	const templatesDir = path.join(srcDir, "templates");
	const routesDir = path.join(srcDir, "routes");
	return file.startsWith(templatesDir) || file.startsWith(routesDir);
}

function writeCodegen(srcDir: string): void {
	const { declarations, manifest } = runCodegen(srcDir);
	fs.writeFileSync(path.join(srcDir, OUTPUT_FILE), declarations);
	fs.writeFileSync(path.join(srcDir, MANIFEST_FILE), manifest);
}

export function frameworkPlugin(): Plugin {
	let srcDir: string;

	return {
		name: PLUGIN_NAME,

		configResolved(config) {
			srcDir = path.join(config.root, "src");
		},

		buildStart() {
			writeCodegen(srcDir);
		},

		transform(code, id) {
			const routesDir = path.join(srcDir, "routes");

			const isRoute = ROUTE_EXTENSIONS.some((ext) => id.endsWith(ext));
			if (!id.startsWith(routesDir) || !isRoute) {
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
					writeCodegen(srcDir);
				}
			});

			server.watcher.on("unlink", (file: string) => {
				if (isWatchedPath(file, srcDir)) {
					writeCodegen(srcDir);
				}
			});

			return createDevMiddleware({ server, srcDir });
		},
	};
}
