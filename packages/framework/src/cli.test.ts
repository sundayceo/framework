import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

function createTempProject(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-test-"));
	const srcDir = path.join(dir, "src");
	const routesDir = path.join(srcDir, "routes");
	const templatesDir = path.join(srcDir, "templates");
	fs.mkdirSync(routesDir, { recursive: true });
	fs.mkdirSync(templatesDir, { recursive: true });
	return dir;
}

const tempDirs: string[] = [];

afterEach(() => {
	for (const dir of tempDirs) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
	tempDirs.length = 0;
});

const CLI_PATH = path.resolve(import.meta.dirname, "cli.ts");
const RUN_CLI = `npx tsx ${CLI_PATH}`;

describe("CLI", () => {
	test("generates framework.gen.d.ts and routes.gen.ts", () => {
		const dir = createTempProject();
		tempDirs.push(dir);

		const srcDir = path.join(dir, "src");
		fs.writeFileSync(
			path.join(srcDir, "routes", "index.tsx"),
			`export default { template: "main", loader: () => ({}), defineSlots: () => ({}) };`,
		);
		fs.writeFileSync(
			path.join(srcDir, "templates", "main.tsx"),
			`export default function Main() { return null; }`,
		);

		const output = execSync(`${RUN_CLI} --src ${srcDir}`, { encoding: "utf-8" });

		expect(output).toContain("Generated framework.gen.d.ts and routes.gen.ts");
		expect(fs.existsSync(path.join(srcDir, "framework.gen.d.ts"))).toBe(true);
		expect(fs.existsSync(path.join(srcDir, "routes.gen.ts"))).toBe(true);
	});

	test("defaults to ./src when --src not provided", () => {
		const dir = createTempProject();
		tempDirs.push(dir);

		const srcDir = path.join(dir, "src");
		fs.writeFileSync(
			path.join(srcDir, "routes", "index.tsx"),
			`export default { template: "main", loader: () => ({}), defineSlots: () => ({}) };`,
		);
		fs.writeFileSync(
			path.join(srcDir, "templates", "main.tsx"),
			`export default function Main() { return null; }`,
		);

		const output = execSync(RUN_CLI, { cwd: dir, encoding: "utf-8" });

		expect(output).toContain("Generated");
		expect(fs.existsSync(path.join(srcDir, "framework.gen.d.ts"))).toBe(true);
	});

	test("exits with code 1 when source directory does not exist", () => {
		try {
			execSync(`${RUN_CLI} --src /tmp/nonexistent-dir-${Date.now()}`, {
				encoding: "utf-8",
				stdio: "pipe",
			});
			expect.unreachable("should have thrown");
		} catch (error: unknown) {
			const execError = error as { status: number; stderr: string };
			expect(execError.status).toBe(1);
			expect(execError.stderr).toContain("Source directory not found");
		}
	});
});
