import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { codegenFromDisk } from "./codegen";

function createFixtureDir(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codegen-"));
	fs.mkdirSync(path.join(dir, "routes"), { recursive: true });
	fs.mkdirSync(path.join(dir, "templates"), { recursive: true });
	return dir;
}

describe("codegenFromDisk", () => {
	let srcDir: string;

	beforeEach(() => {
		srcDir = createFixtureDir();
	});

	afterEach(() => {
		fs.rmSync(srcDir, { recursive: true, force: true });
	});

	test("returns declarations and manifest for a fixture directory", () => {
		fs.writeFileSync(path.join(srcDir, "routes", "index.tsx"), "");
		fs.writeFileSync(path.join(srcDir, "templates", "default.tsx"), "");

		const result = codegenFromDisk(srcDir);

		expect(result).toHaveProperty("declarations");
		expect(result).toHaveProperty("manifest");
		expect(typeof result.declarations).toBe("string");
		expect(typeof result.manifest).toBe("string");
	});

	test("handles empty directories gracefully", () => {
		const result = codegenFromDisk(srcDir);

		expect(result.declarations).toContain("interface TemplateRegistry {");
		expect(result.declarations).toContain("interface RouteMap {");
		expect(result.manifest).toContain("export const routes = [");
		expect(result.manifest).toContain("export const templates = {");
	});

	test("handles missing directories gracefully", () => {
		const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "codegen-empty-"));

		const result = codegenFromDisk(emptyDir);

		expect(result.declarations).toContain("interface TemplateRegistry {");
		expect(result.declarations).toContain("interface RouteMap {");

		fs.rmSync(emptyDir, { recursive: true, force: true });
	});
});
