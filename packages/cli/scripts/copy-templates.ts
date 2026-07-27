import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLACEHOLDER = "{{frameworkVersion}}";

const currentDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(currentDir, "../../..");
const src = resolve(root, "templates");
const dest = resolve(currentDir, "../dist/templates");

/**
 * Templates ship with a `{{frameworkVersion}}` placeholder rather than a hardcoded
 * version, so a scaffolded project always pins the framework release it was created
 * from. release-please bumps the framework package before this build runs, so reading
 * it here picks up the version about to be published.
 */
function readFrameworkVersion(): string {
	const manifestPath = resolve(root, "packages/framework/package.json");
	const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf-8"));

	if (
		typeof manifest !== "object" ||
		manifest === null ||
		!("version" in manifest) ||
		typeof manifest.version !== "string" ||
		manifest.version.length === 0
	) {
		throw new Error(`Could not read a version from ${manifestPath}`);
	}

	return manifest.version;
}

function injectFrameworkVersion(templatesDir: string, version: string): void {
	const manifestPath = resolve(templatesDir, "default/package.json");
	const contents = readFileSync(manifestPath, "utf-8");

	if (!contents.includes(PLACEHOLDER)) {
		throw new Error(`Expected ${PLACEHOLDER} in ${manifestPath}`);
	}

	writeFileSync(manifestPath, contents.split(PLACEHOLDER).join(version));
}

cpSync(src, dest, { recursive: true });
injectFrameworkVersion(dest, readFrameworkVersion());
