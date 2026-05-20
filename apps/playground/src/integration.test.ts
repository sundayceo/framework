import { describe, expect, test } from "vitest";

import { createHandler } from "@sundayceo/framework";

import { app } from "./app";
import { errorPages, hydrationManifest, routes, templates } from "./routes.gen";

const handler = createHandler({
	app,
	routes,
	templates,
	errorPages,
	hydrationManifest,
});

function request(path: string, init?: RequestInit): Promise<Response> {
	return handler.fetch(new Request(`http://localhost${path}`, init));
}

async function html(path: string): Promise<string> {
	const res = await request(path);
	return res.text();
}

describe("static slots (zero JS)", () => {
	test("homepage renders all slots without hydration markers", async () => {
		const body = await html("/");
		expect(body).toContain("data-slot=");
		expect(body).not.toContain("data-hydrate=");
		expect(body).not.toContain("data-hydrate-data=");
		expect(body).not.toContain("HydrateSlot");
	});

	test("async-loader page is fully static", async () => {
		const body = await html("/async-loader");
		expect(body).toContain("async-data-loaded");
		expect(body).not.toContain("data-hydrate=");
	});

	test("blog page with dynamic params hydrates the main slot", async () => {
		const body = await html("/blog/hello-world");
		expect(body).toContain("hello-world");
		expect(body).toContain('data-testid="slug"');
		expect(body).toContain('data-hydrate="main"');
		expect(body).toContain("Count:");
	});
});

describe("hydrated slots (interactive)", () => {
	test("demo page hydrates the main slot only", async () => {
		const body = await html("/demo");
		expect(body).toContain('data-hydrate="main"');
		expect(body).toContain('data-hydrate-data="main"');
		expect(body).toContain('data-slot="header"');
		expect(body).toContain('data-slot="footer"');
	});

	test("hydration data contains loader data as JSON", async () => {
		const body = await html("/demo");
		const regex = /data-hydrate-data="main">([^<]+)</;
		const match = regex.exec(body);
		expect(match).not.toBeNull();
		const data = JSON.parse(match!.at(1)!);
		expect(data).toHaveProperty("title", "Demo Page");
		expect(data).toHaveProperty("description");
	});

	test("fully-hydrated page marks all slots interactive", async () => {
		const body = await html("/full-hydrate");
		expect(body).toContain('data-hydrate="header"');
		expect(body).toContain('data-hydrate="main"');
		expect(body).toContain('data-hydrate="footer"');
	});

	test("fully-hydrated page has hydration data for all slots", async () => {
		const body = await html("/full-hydrate");
		expect(body).toContain('data-hydrate-data="header"');
		expect(body).toContain('data-hydrate-data="main"');
		expect(body).toContain('data-hydrate-data="footer"');
	});
});

describe("partial slots (fallback)", () => {
	test("renders fallback content for unfilled slots", async () => {
		const body = await html("/partial-slots");
		expect(body).toContain("Only Header");
		expect(body).toContain("No content provided.");
		expect(body).toContain("Built with @sundayceo/framework");
	});
});

describe("error pages", () => {
	test("returns 404 for unknown routes", async () => {
		const res = await request("/nonexistent");
		expect(res.status).toBe(404);
		const body = await res.text();
		expect(body).toContain("Page not found");
	});

	test("returns 500 when loader throws", async () => {
		const res = await request("/throw-test");
		expect(res.status).toBe(500);
		const body = await res.text();
		expect(body).toContain("Something went wrong");
		expect(body).toContain("loader-exploded");
	});

	test("httpError() triggers matching error page", async () => {
		const res = await request("/error-test");
		expect(res.status).toBe(404);
		const body = await res.text();
		expect(body).toContain("Page not found");
	});

	test("httpError(403) returns 403 with custom error page", async () => {
		const res = await request("/forbidden-test");
		expect(res.status).toBe(403);
		const body = await res.text();
		expect(body).toContain("Forbidden");
	});

	test("404 error page renders with correct content-type", async () => {
		const res = await request("/nonexistent");
		expect(res.headers.get("content-type")).toBe("text/html;charset=utf-8");
	});
});

describe("redirects", () => {
	test("redirect() returns 302 with location header", async () => {
		const res = await request("/redirect-test");
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toBe("/");
	});
});

describe("API handlers", () => {
	test("GET /api/health returns JSON", async () => {
		const res = await request("/api/health");
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toEqual({ status: "ok" });
	});

	test("POST /api/echo mirrors request body", async () => {
		const res = await request("/api/echo", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ hello: "world" }),
		});
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.method).toBe("POST");
		expect(data.body).toContain("hello");
	});

	test("unsupported method returns 405 with Allow header", async () => {
		const res = await request("/api/health", { method: "DELETE" });
		expect(res.status).toBe(405);
		const allow = res.headers.get("allow") ?? "";
		expect(allow).toContain("GET");
	});

	test("PUT /api/echo returns custom headers", async () => {
		const res = await request("/api/echo", { method: "PUT" });
		expect(res.status).toBe(200);
		expect(res.headers.get("x-custom")).toBe("test-header");
		expect(await res.text()).toBe("put-ok");
	});

	test("DELETE /api/echo returns 204 no content", async () => {
		const res = await request("/api/echo", { method: "DELETE" });
		expect(res.status).toBe(204);
	});

	test("GET /api/echo passes query string", async () => {
		const res = await request("/api/echo?foo=bar");
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.method).toBe("GET");
		expect(data.query).toContain("foo=bar");
	});
});

describe("dynamic route params", () => {
	test("single param: /blog/:slug", async () => {
		const body = await html("/blog/my-post");
		expect(body).toContain("my-post");
		expect(body).toContain('data-testid="slug"');
	});

	test("nested params: /users/:id/posts/:postId", async () => {
		const body = await html("/users/42/posts/7");
		expect(body).toContain('data-testid="params"');
		expect(body).toContain("42");
		expect(body).toContain("7");
	});

	test("static routes take priority over dynamic", async () => {
		const body = await html("/blog/featured");
		expect(body).toContain("Featured");
	});
});

describe("meta tags", () => {
	test("static meta renders title and description", async () => {
		const body = await html("/meta-static");
		expect(body).toContain("<title>Static Title</title>");
		expect(body).toContain('content="Static description"');
	});

	test("dynamic meta uses loader data", async () => {
		const body = await html("/meta-dynamic");
		expect(body).toContain("<title>Dynamic Title</title>");
		expect(body).toContain('content="Description for Dynamic Title"');
	});
});

describe("context injection", () => {
	test("app context is available in loaders", async () => {
		const body = await html("/context-test");
		expect(body).toContain('data-testid="app-name"');
		expect(body).toContain("playground");
	});
});

describe("hydration manifest correctness", () => {
	test("demo page main slot is marked interactive", () => {
		const demo = hydrationManifest["/demo"];
		expect(demo.main).toBe(true);
	});

	test("demo page header and footer are static", () => {
		const demo = hydrationManifest["/demo"];
		expect(demo.header).toBe(false);
		expect(demo.footer).toBe(false);
	});

	test("homepage has no interactive slots", () => {
		const manifest = hydrationManifest["/"];
		expect(manifest).toBeDefined();
		expect(Object.values(manifest).every((v) => !v)).toBe(true);
	});

	test("hydration manifest keys use route matcher format for dynamic routes", () => {
		expect(hydrationManifest).toHaveProperty("/blog/:slug");
		expect(hydrationManifest).toHaveProperty("/docs/*slug");
		expect(hydrationManifest).toHaveProperty("/users/:id/posts/:postId");
		expect(hydrationManifest).not.toHaveProperty("/blog/[slug]");
		expect(hydrationManifest).not.toHaveProperty("/docs/[...slug]");
	});

	test("static pages have all slots marked false", () => {
		const staticPaths = ["/async-loader", "/meta-static", "/context-test"] as const;
		for (const p of staticPaths) {
			const manifest = hydrationManifest[p];
			expect(
				Object.values(manifest).every((v) => !v),
				`${p} has unexpected interactive slot`,
			).toBe(true);
		}
	});

	test("fully-hydrated page has all slots marked true", () => {
		const manifest = hydrationManifest["/full-hydrate"];
		expect(manifest).toBeDefined();
		expect(manifest.header).toBe(true);
		expect(manifest.main).toBe(true);
		expect(manifest.footer).toBe(true);
	});

	test("dynamic route with interactive slot is detected correctly", () => {
		const manifest = hydrationManifest["/blog/:slug"];
		expect(manifest).toBeDefined();
		expect(manifest.main).toBe(true);
		expect(manifest.header).toBe(false);
		expect(manifest.footer).toBe(false);
	});
});

describe("zero-JS guarantee for static pages", () => {
	test("static page contains no script tags", async () => {
		const body = await html("/");
		expect(body).not.toContain("<script");
	});

	test("async-loader page has no script tags", async () => {
		const body = await html("/async-loader");
		expect(body).not.toContain("<script");
	});

	test("dynamic blog page includes hydration script", async () => {
		const body = await html("/blog/hello-world");
		expect(body).toContain("<script");
		expect(body).toContain("hello-world");
	});

	test("meta-static page has no script tags", async () => {
		const body = await html("/meta-static");
		expect(body).not.toContain("<script");
	});

	test("interactive page includes hydration script", async () => {
		const body = await html("/demo");
		expect(body).toContain("<script");
	});

	test("fully-hydrated page includes hydration script", async () => {
		const body = await html("/full-hydrate");
		expect(body).toContain("<script");
	});
});

describe("typo slot warnings", () => {
	test("typo-slot page still renders despite unknown slot", async () => {
		const body = await html("/typo-slot");
		expect(body).toContain("main");
		expect(body).toContain("footer");
	});
});

describe("request access", () => {
	test("loader receives request and can read query params", async () => {
		const body = await html("/request-test?name=claude");
		expect(body).toContain("hello-claude");
	});

	test("loader uses default when no query param", async () => {
		const body = await html("/request-test");
		expect(body).toContain("hello-world");
	});
});

describe("SSR output structure", () => {
	test("pages render valid HTML with doctype", async () => {
		const body = await html("/");
		expect(body).toMatch(/^<!DOCTYPE html>/i);
		expect(body).toContain("<html");
		expect(body).toContain("</html>");
	});

	test("pages include head content without duplicates", async () => {
		const body = await html("/");
		expect(body).toContain("<head>");
		expect(body).toContain("</head>");

		const charsetCount = (body.match(/charSet="utf-8"/g) ?? []).length;
		expect(charsetCount).toBe(1);

		const viewportCount = (body.match(/viewport/g) ?? []).length;
		expect(viewportCount).toBe(1);
	});

	test("data-slot attributes mark slot boundaries", async () => {
		const body = await html("/");
		expect(body).toContain('data-slot="header"');
		expect(body).toContain('data-slot="main"');
		expect(body).toContain('data-slot="footer"');
	});
});

describe("response headers", () => {
	test("HTML pages have correct content-type", async () => {
		const res = await request("/");
		expect(res.headers.get("content-type")).toBe("text/html;charset=utf-8");
	});

	test("API responses have correct content-type", async () => {
		const res = await request("/api/health");
		expect(res.headers.get("content-type")).toContain("application/json");
	});

});

describe("HTTP method support", () => {
	test("HEAD request returns headers without body for API handler", async () => {
		const res = await request("/api/health", { method: "HEAD" });
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("");
	});

	test("OPTIONS request returns allowed methods", async () => {
		const res = await request("/api/health", { method: "OPTIONS" });
		const allow = res.headers.get("allow") ?? "";
		expect(allow).toContain("GET");
	});

	test("POST to a page route returns 405 with Allow header", async () => {
		const res = await request("/", { method: "POST" });
		expect(res.status).toBe(405);
		const allow = res.headers.get("allow") ?? "";
		expect(allow).toContain("GET");
		expect(allow).toContain("HEAD");
	});

	test("DELETE to a page route returns 405 with Allow header", async () => {
		const res = await request("/blog/hello", { method: "DELETE" });
		expect(res.status).toBe(405);
		expect(res.headers.get("allow")).toContain("GET");
	});

	test("HEAD to a page route returns headers without body", async () => {
		const res = await request("/", { method: "HEAD" });
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("text/html;charset=utf-8");
		expect(await res.text()).toBe("");
	});

	test("OPTIONS to a page route returns allowed methods", async () => {
		const res = await request("/", { method: "OPTIONS" });
		const allow = res.headers.get("allow") ?? "";
		expect(allow).toContain("GET");
		expect(allow).toContain("HEAD");
		expect(allow).toContain("OPTIONS");
	});
});

describe("codegen output", () => {
	test("templates registry has default template", () => {
		expect(templates).toHaveProperty("default");
		expect(typeof templates.default).toBe("function");
	});

	test("error pages are defined for 404 and 500", () => {
		expect(errorPages).toHaveProperty("404");
		expect(errorPages).toHaveProperty("500");
	});

	test("dynamic routes have params defined", () => {
		const slugRoute = routes.find((r) => r.routePath === "/blog/:slug");
		expect(slugRoute).toBeDefined();
		expect(slugRoute!.params).toEqual(["slug"]);

		const nestedRoute = routes.find((r) => r.routePath === "/users/:id/posts/:postId");
		expect(nestedRoute).toBeDefined();
		expect(nestedRoute!.params).toEqual(["id", "postId"]);
	});

	test("catch-all routes have params defined", () => {
		const catchAllRoute = routes.find((r) => r.routePath === "/docs/*slug");
		expect(catchAllRoute).toBeDefined();
		expect(catchAllRoute!.params).toEqual(["slug"]);
	});
});

describe("URL decoding", () => {
	test("dynamic params are URL-decoded", async () => {
		const body = await html("/blog/hello%20world");
		expect(body).toContain("hello world");
	});

	test("catch-all params are URL-decoded", async () => {
		const body = await html("/docs/caf%C3%A9/menu%20items");
		expect(body).toContain("café/menu items");
	});
});

describe("XSS protection", () => {
	test("hydration JSON data does not contain raw angle brackets", async () => {
		const body = await html("/demo");
		const dataMatch = /data-hydrate-data="main">([^<]+)</.exec(body);
		expect(dataMatch).not.toBeNull();
		const jsonContent = dataMatch!.at(1)!;
		expect(jsonContent).not.toContain("</script>");
	});
});

describe("route groups", () => {
	test("route group strips parenthesized directory from URL", async () => {
		const res = await request("/pricing");
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain("Pricing");
		expect(body).toContain("pro");
	});

	test("route group page renders in correct template", async () => {
		const body = await html("/pricing");
		expect(body).toContain('data-slot="header"');
		expect(body).toContain('data-slot="main"');
		expect(body).toContain('data-slot="footer"');
	});

	test("route group page is included in codegen routes", () => {
		const pricingRoute = routes.find((r) => r.routePath === "/pricing");
		expect(pricingRoute).toBeDefined();
		expect(pricingRoute!.params).toEqual([]);
	});
});

describe("catch-all routes", () => {
	test("catch-all matches single segment", async () => {
		const res = await request("/docs/intro");
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain("intro");
		expect(body).toContain("Docs");
	});

	test("catch-all matches nested segments", async () => {
		const res = await request("/docs/getting-started/install");
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain("getting-started/install");
	});

	test("catch-all matches deeply nested path", async () => {
		const res = await request("/docs/api/v2/users/list");
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain("api/v2/users/list");
	});
});
