import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const playgroundRoot = path.resolve(thisDir, "..");

describe("SSR build", () => {
	test("vite build --ssr entry.cloudflare.ts succeeds", () => {
		const result = execSync("pnpm build", {
			cwd: playgroundRoot,
			encoding: "utf-8",
			timeout: 30_000,
		});

		expect(result).toContain("built in");
	});

	test("build output exists at dist/entry.cloudflare.js", () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		expect(existsSync(outputPath)).toBe(true);
	});

	test("built bundle exports a default handler with fetch method", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		expect(typeof mod.default).toBe("object");
		expect(typeof mod.default.fetch).toBe("function");
	});

	test("built handler serves homepage as HTML", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(new Request("http://localhost/"));
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("text/html;charset=utf-8");
		const body = await res.text();
		expect(body).toContain("<!DOCTYPE html>");
		expect(body).toContain("data-slot=");
	});

	test("built handler returns 404 for unknown routes", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(new Request("http://localhost/nonexistent"));
		expect(res.status).toBe(404);
	});

	test("built handler serves API routes as JSON", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(new Request("http://localhost/api/health"));
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toEqual({ status: "ok" });
	});

	test("built handler decodes URL params", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(new Request("http://localhost/blog/hello%20world"));
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain("hello world");
	});

	test("built handler serves catch-all routes", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(
			new Request("http://localhost/docs/getting-started/install"),
		);
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain("getting-started/install");
	});

	test("built handler returns custom 404 error page", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(new Request("http://localhost/nonexistent"));
		expect(res.status).toBe(404);
		const body = await res.text();
		expect(body).toContain("Page not found");
	});

	test("built handler handles redirect responses", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(new Request("http://localhost/redirect-test"));
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toBe("/");
	});

	test("built handler returns 405 for unsupported methods", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(
			new Request("http://localhost/api/health", { method: "DELETE" }),
		);
		expect(res.status).toBe(405);
	});

	test("built handler serves HEAD requests without body", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(
			new Request("http://localhost/api/health", { method: "HEAD" }),
		);
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("");
	});

	test("built handler renders async loader data", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(new Request("http://localhost/async-loader"));
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain("async-data-loaded");
	});

	test("built handler renders dynamic meta tags", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(new Request("http://localhost/meta-dynamic"));
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain("<title>Dynamic Title</title>");
	});

	test("built handler returns 405 for POST to page route", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(new Request("http://localhost/", { method: "POST" }));
		expect(res.status).toBe(405);
	});

	test("built handler returns headers without body for HEAD to page route", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(new Request("http://localhost/", { method: "HEAD" }));
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("text/html;charset=utf-8");
		expect(await res.text()).toBe("");
	});

	test("built handler includes hydration data for interactive pages", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(new Request("http://localhost/demo"));
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain('data-hydrate="main"');
		expect(body).toContain('data-hydrate-data="main"');
		const dataMatch = /data-hydrate-data="main">([^<]+)</.exec(body);
		expect(dataMatch).not.toBeNull();
		const parsed = JSON.parse(dataMatch!.at(1)!);
		expect(parsed).toHaveProperty("title");
	});

	test("built handler does not hydrate static slots", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(new Request("http://localhost/demo"));
		const body = await res.text();
		expect(body).not.toContain('data-hydrate="header"');
		expect(body).not.toContain('data-hydrate="footer"');
		expect(body).toContain('data-slot="header"');
		expect(body).toContain('data-slot="footer"');
	});

	test("built handler renders static pages without script tags", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(new Request("http://localhost/"));
		const body = await res.text();
		expect(body).not.toContain("<script");
	});

	test("built handler serves route group pages at ungrouped URL", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(new Request("http://localhost/pricing"));
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain("Pricing");
		expect(body).toContain("pro");
	});

	test("built handler hydrates dynamic route with interactive slot", async () => {
		const outputPath = path.join(playgroundRoot, "dist", "entry.cloudflare.js");
		const mod = await import(outputPath);
		const res = await mod.default.fetch(new Request("http://localhost/blog/my-post"));
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain("my-post");
		expect(body).toContain('data-hydrate="main"');
		expect(body).toContain("Count:");
		expect(body).toContain('<script type="module">');
	});
});
