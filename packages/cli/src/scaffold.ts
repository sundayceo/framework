import { cpSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type ScaffoldOptions = {
	name: string;
	path: string;
};

export type ScaffoldContext = {
	templatesDir?: string;
	cwd?: string;
};

const DEFAULT_TEMPLATES_DIR = resolve(fileURLToPath(import.meta.url), "../templates/default");

const TEXT_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".js",
	".jsx",
	".json",
	".md",
	".txt",
	".css",
	".html",
	".yaml",
	".yml",
	".toml",
	".mjs",
	".cjs",
]);

function isTextFile(filePath: string): boolean {
	const ext = filePath.slice(filePath.lastIndexOf("."));
	return TEXT_EXTENSIONS.has(ext) || basename(filePath).startsWith("_");
}

function replacePlaceholders(dir: string, replacements: Record<string, string>): void {
	const entries = readdirSync(dir);
	for (const entry of entries) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			replacePlaceholders(fullPath, replacements);
		} else if (isTextFile(fullPath)) {
			let content = readFileSync(fullPath, "utf-8");
			for (const [placeholder, value] of Object.entries(replacements)) {
				const segments = content.split(placeholder);
				content = segments.join(value);
			}
			writeFileSync(fullPath, content);
		}
	}
}

function renameUnderscoredFiles(dir: string): void {
	const entries = readdirSync(dir);
	for (const entry of entries) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			renameUnderscoredFiles(fullPath);
		} else if (entry.startsWith("_")) {
			const newName = `.${entry.slice(1)}`;
			renameSync(fullPath, join(dir, newName));
		}
	}
}

export function scaffold(options: ScaffoldOptions, ctx?: ScaffoldContext): string {
	const templatesDir = ctx?.templatesDir ?? DEFAULT_TEMPLATES_DIR;
	const cwd = ctx?.cwd ?? process.cwd();
	const destDir = resolve(cwd, options.path);

	cpSync(templatesDir, destDir, { recursive: true });
	renameUnderscoredFiles(destDir);
	replacePlaceholders(destDir, { "{{name}}": options.name });

	return destDir;
}
