import fs from "node:fs";
import path from "node:path";

const RESOLVE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

type QueueItem = { specifier: string; fromDir: string };

function resolveQueueItem(
	item: QueueItem,
	visited: Set<string>,
): { depSource: string; specifier: string; childDir: string } | undefined {
	const key = `${item.fromDir}:${item.specifier}`;
	if (visited.has(key)) {
		return undefined;
	}
	visited.add(key);

	const resolved = resolveFile(item.specifier, item.fromDir);
	if (resolved === undefined) {
		return undefined;
	}

	return {
		depSource: fs.readFileSync(resolved, "utf-8"),
		specifier: item.specifier,
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

		for (const specifier of extractImportSpecifiers(source)) {
			queue.push({ specifier, fromDir: routeDir });
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

/** Extracts relative import specifiers from a source string, skipping type-only imports. */
export function extractImportSpecifiers(source: string): string[] {
	const specifiers: string[] = [];
	const importRegex = /\bimport\s+(type\s+)?.*?\s+from\s+["']([^"']+)["']/g;
	let match;

	while ((match = importRegex.exec(source)) !== null) {
		if (match.at(1) === undefined) {
			const specifier = match.at(2);
			if (specifier?.startsWith(".")) {
				specifiers.push(specifier);
			}
		}
	}

	return specifiers;
}

/** Walks the import graph starting from route sources and returns all reachable dependency sources. */
export function buildImportGraph(
	routeSources: Record<string, string>,
	routesDir: string,
	filePathMap?: Record<string, string>,
): Record<string, string> {
	const graph: Record<string, string> = {};
	const queue = seedQueue(routeSources, routesDir, filePathMap);
	const visited = new Set<string>();

	while (queue.length > 0) {
		const item = queue.pop();
		if (item === undefined) {
			break;
		}

		const result = resolveQueueItem(item, visited);
		if (result !== undefined) {
			graph[result.specifier] = result.depSource;

			for (const childSpec of extractImportSpecifiers(result.depSource)) {
				queue.push({ specifier: childSpec, fromDir: result.childDir });
			}
		}
	}

	return graph;
}
