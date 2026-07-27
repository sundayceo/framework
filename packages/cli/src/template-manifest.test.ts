import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readManifest(path: string): Record<string, unknown> {
	return JSON.parse(readFileSync(resolve(root, path), "utf-8")) as Record<string, unknown>;
}

function dependencyEntries(manifest: Record<string, unknown>): [string, string][] {
	return ["dependencies", "devDependencies"].flatMap((field) =>
		Object.entries((manifest[field] ?? {}) as Record<string, string>),
	);
}

describe("default template manifest", () => {
	const manifest = readManifest("templates/default/package.json");

	it("pins the framework to a build-time placeholder rather than a literal version", () => {
		const deps = manifest.dependencies as Record<string, string>;

		expect(deps["@sundayceo/framework"]).toBe("{{frameworkVersion}}");
	});

	it("depends on no unpublished internal packages", () => {
		// Only @sundayceo/framework is published. Any other @sundayceo/* dependency is
		// private to the workspace and cannot be installed by a scaffolded project.
		const internal = dependencyEntries(manifest)
			.map(([name]) => name)
			.filter((name) => name.startsWith("@sundayceo/") && name !== "@sundayceo/framework");

		expect(internal).toEqual([]);
	});

	it("declares no dependency pinned to the placeholder version 0.0.0", () => {
		const zeroPinned = dependencyEntries(manifest)
			.filter(([, range]) => range === "0.0.0")
			.map(([name]) => name);

		expect(zeroPinned).toEqual([]);
	});
});

describe("default template tsconfig", () => {
	const tsconfig = readManifest("templates/default/tsconfig.json");

	it("does not extend a workspace-private config package", () => {
		// A scaffolded project resolves "extends" from its own node_modules, so it can
		// only reference packages that are actually published.
		expect(tsconfig.extends).toBeUndefined();
	});

	it("keeps the compiler options the template needs to build", () => {
		const options = tsconfig.compilerOptions as Record<string, unknown>;

		expect(options.jsx).toBe("react-jsx");
		expect(options.strict).toBe(true);
		expect(options.noEmit).toBe(true);
		expect(options.rootDir).toBe("src");
	});
});
