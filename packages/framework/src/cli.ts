import fs from "node:fs";
import path from "node:path";

import { codegenFromDisk } from "./codegen-disk/codegen";

const OUTPUT_FILE = "framework.gen.d.ts";
const MANIFEST_FILE = "routes.gen.ts";

function resolveSourceDir(args: string[]): string {
	const srcIndex = args.indexOf("--src");
	const srcArg = srcIndex !== -1 ? args.at(srcIndex + 1) : undefined;
	if (srcArg !== undefined) {
		return path.resolve(srcArg);
	}
	return path.resolve("src");
}

function run(): void {
	const srcDir = resolveSourceDir(process.argv.slice(2));

	if (!fs.existsSync(srcDir)) {
		// eslint-disable-next-line no-console
		console.error(`Source directory not found: ${srcDir}`);
		process.exitCode = 1;
		return;
	}

	const { declarations, manifest } = codegenFromDisk(srcDir);
	fs.writeFileSync(path.join(srcDir, OUTPUT_FILE), declarations);
	fs.writeFileSync(path.join(srcDir, MANIFEST_FILE), manifest);

	// eslint-disable-next-line no-console
	console.log(`Generated ${OUTPUT_FILE} and ${MANIFEST_FILE} in ${srcDir}`);
}

run();
