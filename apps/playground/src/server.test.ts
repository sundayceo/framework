import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const playgroundRoot = path.resolve(thisDir, "..");

describe("SSR build", () => {
	test("vite build --ssr src/server.ts succeeds", () => {
		const result = execSync("pnpm build", {
			cwd: playgroundRoot,
			encoding: "utf-8",
			timeout: 30_000,
		});

		expect(result).toContain("built in");
	});

	test("build output exists at dist/server.js", () => {
		const outputPath = path.join(playgroundRoot, "dist", "server.js");
		expect(existsSync(outputPath)).toBe(true);
	});

	test("built bundle exports a default handler with fetch method", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "server.js");
		const mod = await import(outputPath);
		expect(typeof mod.default).toBe("object");
		expect(typeof mod.default.fetch).toBe("function");
	});
});
