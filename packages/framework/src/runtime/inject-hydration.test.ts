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

		// each interactive slot gets an independent hydration script
		const moduleScripts = result.match(/<script type="module">/g) ?? [];
		expect(moduleScripts.length).toBe(3);
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

		expect(result).toContain('data-hydrate-data="counter">');
		expect(result).toContain('"items"');
		expect(result).toContain('"count":42');
	});

	test("escapes script-breaking characters in loader data", () => {
		const loaderData = { html: '</script><script>alert("xss")</script>' };

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

		expect(result).not.toContain("</script><script>");
		expect(result).toContain("\\u003c/script>");
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

	test("handles nested divs inside slot content", () => {
		const htmlWithNestedDivs = [
			"<!DOCTYPE html>",
			'<html lang="en">',
			"<head><title>Test</title></head>",
			"<body>",
			'<div data-slot="main"><div class="wrapper"><div class="inner"><p>Deep</p></div></div></div>',
			"</body>",
			"</html>",
		].join("");

		const result = injectHydration({
			html: htmlWithNestedDivs,
			slotInteractivity: { main: true },
			routePath: "/nested",
			loaderData: {},
		});

		expect(result).toContain(
			'<div data-hydrate="main"><div class="wrapper"><div class="inner"><p>Deep</p></div></div></div>',
		);
		expect(result).not.toContain('data-slot="main"');
	});

	test("skips slot when its data-slot tag is missing from HTML", () => {
		const html = "<!DOCTYPE html><html><body><p>No slots here</p></body></html>";

		const result = injectHydration({
			html,
			slotInteractivity: { missing: true },
			routePath: "/test",
			loaderData: {},
		});

		// Script tags are still appended even though the slot div was not found
		expect(result).toContain('<script type="module">');
		// The original slot div is not present, so no wrapping div is added
		expect(result).not.toContain('<div data-hydrate="missing">');
	});

	test("handles unclosed slot div gracefully", () => {
		const html = '<!DOCTYPE html><html><body><div data-slot="broken"><p>unclosed</body></html>';

		const result = injectHydration({
			html,
			slotInteractivity: { broken: true },
			routePath: "/test",
			loaderData: {},
		});

		// The slot content is not wrapped because findSlotContent returns null for unclosed div
		expect(result).not.toContain('<div data-hydrate="broken">');
		expect(result).toContain('<script type="module">');
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
