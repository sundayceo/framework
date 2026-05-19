import fs from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

const SRC = path.resolve(import.meta.dirname);

function readSourceFiles(dir: string): { file: string; content: string }[] {
	if (!fs.existsSync(dir)) {
		return [];
	}

	const files = fs
		.readdirSync(dir, { recursive: true })
		.filter(
			(f): f is string =>
				typeof f === "string" && (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.includes(".test."),
		);

	return files.map((f) => ({
		file: f,
		content: fs.readFileSync(path.join(dir, f), "utf-8"),
	}));
}

function extractImportPaths(content: string): string[] {
	const matches = content.matchAll(/from ["']([^"']+)["']/g);
	return [...matches].map((m) => m.at(1)).filter((p): p is string => p !== undefined);
}

describe("module boundary rules", () => {
	test("runtime/ does not import from codegen/", () => {
		const files = readSourceFiles(path.join(SRC, "runtime"));
		for (const { file, content } of files) {
			const imports = extractImportPaths(content);
			const violations = imports.filter((p) => p.includes("/codegen/") || p.includes("../codegen"));
			expect(violations, `runtime/${file} imports from codegen: ${violations.join(", ")}`).toEqual(
				[],
			);
		}
	});

	test("runtime/ does not import from vite/", () => {
		const files = readSourceFiles(path.join(SRC, "runtime"));
		for (const { file, content } of files) {
			const imports = extractImportPaths(content);
			const violations = imports.filter((p) => p.includes("/vite/") || p.includes("../vite"));
			expect(violations, `runtime/${file} imports from vite: ${violations.join(", ")}`).toEqual([]);
		}
	});

	test("codegen/ does not import from vite/", () => {
		const files = readSourceFiles(path.join(SRC, "codegen"));
		for (const { file, content } of files) {
			const imports = extractImportPaths(content);
			const violations = imports.filter((p) => p.includes("/vite/") || p.includes("../vite"));
			expect(violations, `codegen/${file} imports from vite: ${violations.join(", ")}`).toEqual([]);
		}
	});

	test("codegen/ has no Node.js filesystem imports", () => {
		const files = readSourceFiles(path.join(SRC, "codegen"));
		for (const { file, content } of files) {
			const imports = extractImportPaths(content);
			const violations = imports.filter(
				(p) => p === "node:fs" || p === "node:path" || p === "fs" || p === "path",
			);
			expect(
				violations,
				`codegen/${file} imports Node.js modules: ${violations.join(", ")}`,
			).toEqual([]);
		}
	});

	test("codegen-disk/ imports from codegen only (plus Node.js)", () => {
		const dir = path.join(SRC, "codegen-disk");
		const files = readSourceFiles(dir);
		for (const { file, content } of files) {
			const imports = extractImportPaths(content);
			const violations = imports.filter(
				(p) => !p.startsWith("node:") && !p.startsWith("../codegen") && !p.startsWith("./"),
			);
			expect(
				violations,
				`codegen-disk/${file} imports outside codegen: ${violations.join(", ")}`,
			).toEqual([]);
		}
	});

	test("codegen/ does not import from runtime/ (except type-only)", () => {
		const files = readSourceFiles(path.join(SRC, "codegen"));
		for (const { file, content } of files) {
			const lines = content.split("\n");
			for (const line of lines) {
				if (line.includes("../runtime") && line.startsWith("import ")) {
					expect(
						line.includes("import type"),
						`codegen/${file} has non-type import from runtime: ${line.trim()}`,
					).toBe(true);
				}
			}
		}
	});
});
