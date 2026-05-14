import { describe, expect, test } from "vitest";

import { injectHydration } from "./inject-hydration";

describe("injectHydration", () => {
	const BASE_HTML = [
		"<!DOCTYPE html>",
		'<html lang="en">',
		"<head><title>Test</title></head>",
		"<body>",
		'<div data-slot="header"><h1>Header</h1></div>',
		'<div data-slot="counter"><button>Count: 0</button></div>',
		'<div data-slot="footer"><footer>Footer</footer></div>',
		"</body>",
		"</html>",
	].join("");

	test("all-static page produces no script tags", () => {
		const result = injectHydration({
			html: BASE_HTML,
			slotInteractivity: {
				header: false,
				counter: false,
				footer: false,
			},
			routePath: "/pages/home",
			loaderData: {},
		});

		expect(result).not.toContain("<script");
		expect(result).not.toContain("data-hydrate=");
		expect(result).toContain("<h1>Header</h1>");
		expect(result).toContain("<button>Count: 0</button>");
		expect(result).toContain("<footer>Footer</footer>");
	});

	test("all-interactive page adds scripts for every slot", () => {
		const result = injectHydration({
			html: BASE_HTML,
			slotInteractivity: {
				header: true,
				counter: true,
				footer: true,
			},
			routePath: "/pages/home",
			loaderData: { count: 0 },
		});

		expect(result).toContain('data-hydrate="header"');
		expect(result).toContain('data-hydrate="counter"');
		expect(result).toContain('data-hydrate="footer"');
		expect(result).toContain('<script type="module">');
		expect(result).toContain('<script type="application/json" data-hydrate-data="header">');
		expect(result).toContain('<script type="application/json" data-hydrate-data="counter">');
		expect(result).toContain('<script type="application/json" data-hydrate-data="footer">');
	});

	test("mixed page only adds scripts for interactive slots", () => {
		const result = injectHydration({
			html: BASE_HTML,
			slotInteractivity: {
				header: false,
				counter: true,
				footer: false,
			},
			routePath: "/pages/home",
			loaderData: { count: 0 },
		});

		expect(result).not.toContain('data-hydrate="header"');
		expect(result).toContain('data-hydrate="counter"');
		expect(result).not.toContain('data-hydrate="footer"');

		const scriptCount = (result.match(/<script type="module">/g) ?? []).length;
		expect(scriptCount).toBe(1);
	});

	test("wraps interactive slot content in hydration boundary div", () => {
		const result = injectHydration({
			html: BASE_HTML,
			slotInteractivity: {
				header: false,
				counter: true,
				footer: false,
			},
			routePath: "/pages/home",
			loaderData: {},
		});

		expect(result).toContain('<div data-hydrate="counter"><button>Count: 0</button></div>');
	});

	test("serializes loader data as JSON in script tag", () => {
		const loaderData = { items: ["a", "b"], count: 42 };

		const result = injectHydration({
			html: BASE_HTML,
			slotInteractivity: {
				header: false,
				counter: true,
				footer: false,
			},
			routePath: "/pages/home",
			loaderData,
		});

		expect(result).toContain(
			`<script type="application/json" data-hydrate-data="counter">${JSON.stringify(loaderData)}</script>`,
		);
	});

	test("multiple interactive slots each get independent hydration", () => {
		const result = injectHydration({
			html: BASE_HTML,
			slotInteractivity: {
				header: true,
				counter: true,
				footer: false,
			},
			routePath: "/pages/home",
			loaderData: { x: 1 },
		});

		const moduleScripts = result.match(/<script type="module">/g) ?? [];
		expect(moduleScripts.length).toBe(2);

		expect(result).toContain('data-hydrate="header"');
		expect(result).toContain('data-hydrate="counter"');
		expect(result).not.toContain('data-hydrate="footer"');

		expect(result).toContain('data-hydrate-data="header"');
		expect(result).toContain('data-hydrate-data="counter"');
		expect(result).not.toContain('data-hydrate-data="footer"');
	});

	test("static slots preserve their HTML content unchanged", () => {
		const result = injectHydration({
			html: BASE_HTML,
			slotInteractivity: {
				header: false,
				counter: true,
				footer: false,
			},
			routePath: "/pages/home",
			loaderData: {},
		});

		expect(result).toContain('<div data-slot="header"><h1>Header</h1></div>');
		expect(result).toContain('<div data-slot="footer"><footer>Footer</footer></div>');
	});

	test("hydration script references the correct route path", () => {
		const result = injectHydration({
			html: BASE_HTML,
			slotInteractivity: {
				header: false,
				counter: true,
				footer: false,
			},
			routePath: "/pages/dashboard",
			loaderData: {},
		});

		expect(result).toContain("/pages/dashboard");
	});
});
