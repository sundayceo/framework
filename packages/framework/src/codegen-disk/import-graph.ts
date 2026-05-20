import fs from "node:fs";
import path from "node:path";

import { parseImportSpecifiers } from "../codegen/parse-imports";

const RESOLVE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

type QueueItem = { specifier: string; fromDir: string };

function resolveQueueItem(
	item: QueueItem,
	visited: Set<string>,
): { depSource: string; resolvedPath: string; childDir: string } | undefined {
	const resolved = resolveFile(item.specifier, item.fromDir);
	if (resolved === undefined) {
		return undefined;
	}

	if (visited.has(resolved)) {
		return undefined;
	}
	visited.add(resolved);

	return {
		depSource: fs.readFileSync(resolved, "utf-8"),
		resolvedPath: resolved,
		childDir: path.dirname(resolved),
	};
}

function seedQueue(
	routeSources: Record<string, string>,
	routesDir: string,
	filePathMap?: Record<string, string>,
): QueueItem[] {
	const queue: QueueItem[] = [];

	for (const [routePath, source] of Object.entries(routeSources)) {
		const filePath = filePathMap?.[routePath];
		const routeFile = filePath ?? `${routePath.replace(/^\//, "")}.tsx`;
		const routeDir = path.dirname(path.join(routesDir, routeFile));

		for (const specifier of parseImportSpecifiers(source)) {
			if (specifier.startsWith(".")) {
				queue.push({ specifier, fromDir: routeDir });
			}
		}
	}

	return queue;
}

/** Resolves a relative import specifier to a file path, checking direct files and index files. */
export function resolveFile(specifier: string, fromDir: string): string | undefined {
	for (const ext of RESOLVE_EXTENSIONS) {
		const candidate = path.resolve(fromDir, `${specifier}${ext}`);
		if (fs.existsSync(candidate)) {
			return candidate;
		}

		const indexCandidate = path.resolve(fromDir, specifier, `index${ext}`);
		if (fs.existsSync(indexCandidate)) {
			return indexCandidate;
		}
	}

	return undefined;
}

/** Walks the import graph starting from route sources and returns all reachable dependency sources keyed by absolute resolved path. */
export function buildImportGraph(
	routeSources: Record<string, string>,
	routesDir: string,
	filePathMap?: Record<string, string>,
): Record<string, string> {
	const graph: Record<string, string> = {};
	const queue = seedQueue(routeSources, routesDir, filePathMap);
	const visited = new Set<string>();

	while (queue.length > 0) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length > 0 guarantees pop() returns a value
		const item = queue.pop()!;

		const result = resolveQueueItem(item, visited);
		if (result !== undefined) {
			graph[result.resolvedPath] = result.depSource;

			const childSpecs = parseImportSpecifiers(result.depSource).filter((s) =>
				s.startsWith("."),
			);
			for (const childSpec of childSpecs) {
				queue.push({ specifier: childSpec, fromDir: result.childDir });
			}
		}
	}

	return graph;
}
