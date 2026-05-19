import fs from "node:fs";
import path from "node:path";

import { codegen, type CodegenOutput } from "../codegen/build";

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

export function codegenFromDisk(srcDir: string): CodegenOutput {
	const routePaths = scanDir(path.join(srcDir, "routes"), ROUTE_EXTENSIONS);
	const templatePaths = scanDir(path.join(srcDir, "templates"), TEMPLATE_EXTENSIONS);

	return codegen({ routePaths, templatePaths });
}
