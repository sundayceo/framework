import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { scaffold } from "./scaffold";

describe("scaffold", () => {
	let tempDir: string;
	let templateDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "create-sundayceo-test-"));
		templateDir = join(tempDir, "template");
		mkdirSync(join(templateDir, "src"), { recursive: true });
		writeFileSync(join(templateDir, "package.json"), '{ "name": "{{name}}" }\n');
		writeFileSync(join(templateDir, "src", "app.ts"), 'console.log("{{name}}")\n');
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("replaces name placeholder in package.json", () => {
		scaffold({ name: "my-app", path: "output" }, { templatesDir: templateDir, cwd: tempDir });

		const content = readFileSync(join(tempDir, "output", "package.json"), "utf-8");
		expect(content).toContain('"my-app"');
		expect(content).not.toContain("{{name}}");
	});

	it("replaces placeholders in nested files", () => {
		scaffold({ name: "my-app", path: "output" }, { templatesDir: templateDir, cwd: tempDir });

		const content = readFileSync(join(tempDir, "output", "src", "app.ts"), "utf-8");
		expect(content).toContain("my-app");
		expect(content).not.toContain("{{name}}");
	});

	it("renames _gitignore to .gitignore", () => {
		writeFileSync(join(templateDir, "_gitignore"), "node_modules\n");

		scaffold({ name: "my-app", path: "output" }, { templatesDir: templateDir, cwd: tempDir });

		expect(existsSync(join(tempDir, "output", ".gitignore"))).toBe(true);
		expect(existsSync(join(tempDir, "output", "_gitignore"))).toBe(false);
	});

	it("creates output directory at correct path", () => {
		const destDir = scaffold(
			{ name: "my-app", path: "output" },
			{ templatesDir: templateDir, cwd: tempDir },
		);

		expect(destDir).toBe(join(tempDir, "output"));
		expect(existsSync(destDir)).toBe(true);
	});

	it("supports custom path different from name", () => {
		scaffold({ name: "my-app", path: "custom-dir" }, { templatesDir: templateDir, cwd: tempDir });

		const content = readFileSync(join(tempDir, "custom-dir", "package.json"), "utf-8");
		expect(content).toContain('"my-app"');
	});
});
