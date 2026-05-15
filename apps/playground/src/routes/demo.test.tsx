import React from "react";
import { describe, expect, test } from "vitest";

import { renderPage, Slot, type TemplateComponent } from "@sundayceo/framework";

import { page } from "./demo";

const TestTemplate: TemplateComponent = ({ head }) => (
	<html lang="en">
		<head>{head}</head>
		<body>
			<header>
				<Slot id="header" />
			</header>
			<main>
				<Slot id="main" />
			</main>
			<footer>
				<Slot id="footer" />
			</footer>
		</body>
	</html>
);

type LoaderData = { title: string; description: string };

async function callLoader(): Promise<LoaderData> {
	return page.loader({
		params: {},
		request: new Request("http://localhost/demo"),
	});
}

const defaultRequest = new Request("http://localhost/demo");
const defaultParams = {};
const defaultAppContext = {};

describe("demo page structure", () => {
	test("has a loader function", () => {
		expect(page.loader).toBeDefined();
		expect(typeof page.loader).toBe("function");
	});

	test("loader returns data with title and description", async () => {
		const data = await callLoader();
		expect(data).toBeDefined();
		expect(typeof data).toBe("object");
		expect(data).toHaveProperty("title");
		expect(data).toHaveProperty("description");
	});

	test("has defineSlots function", () => {
		expect(page.defineSlots).toBeDefined();
		expect(typeof page.defineSlots).toBe("function");
	});

	test("defineSlots returns header, main, and footer slots", async () => {
		const loaderData = await callLoader();
		const slots = page.defineSlots({ loaderData });
		expect(slots).toHaveProperty("header");
		expect(slots).toHaveProperty("main");
		expect(slots).toHaveProperty("footer");
	});

	test("uses template 'default'", () => {
		expect(page.template).toBe("default");
	});
});

describe("demo page SSR rendering", () => {
	test("renders all slots with loader data", async () => {
		const response = await renderPage({
			pageModule: page as Parameters<typeof renderPage>[0]["pageModule"],
			template: TestTemplate,
			request: defaultRequest,
			params: defaultParams,
			appContext: defaultAppContext,
		});

		const html = await response.text();
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("<h1>Demo Page</h1>");
		expect(html).toContain("Count:");
		expect(html).toContain("Static footer content");
	});

	test("renders interactive component with initial state", async () => {
		const response = await renderPage({
			pageModule: page as Parameters<typeof renderPage>[0]["pageModule"],
			template: TestTemplate,
			request: defaultRequest,
			params: defaultParams,
			appContext: defaultAppContext,
		});

		const html = await response.text();
		expect(html).toContain("<button>");
		expect(html).toContain("Count:");
	});
});

describe("demo page hydration", () => {
	const interactiveSource = 'import { useState } from "react"; const [c, setC] = useState(0);';
	const staticSource = "function Header() { return <h1>Hello</h1>; }";

	test("interactive slot gets hydration script", async () => {
		const response = await renderPage({
			pageModule: page as Parameters<typeof renderPage>[0]["pageModule"],
			template: TestTemplate,
			request: defaultRequest,
			params: defaultParams,
			appContext: defaultAppContext,
			slotSources: { header: staticSource, main: interactiveSource, footer: staticSource },
			routePath: "/demo",
		});

		const html = await response.text();

		expect(html).toContain('data-hydrate="main"');
		expect(html).toContain('<script type="module">');
		expect(html).toContain('<script type="application/json" data-hydrate-data="main">');
	});

	test("static slots do not get hydration scripts", async () => {
		const response = await renderPage({
			pageModule: page as Parameters<typeof renderPage>[0]["pageModule"],
			template: TestTemplate,
			request: defaultRequest,
			params: defaultParams,
			appContext: defaultAppContext,
			slotSources: { header: staticSource, main: interactiveSource, footer: staticSource },
			routePath: "/demo",
		});

		const html = await response.text();

		expect(html).not.toContain('data-hydrate="header"');
		expect(html).not.toContain('data-hydrate="footer"');
	});

	test("hydration script references the correct route path", async () => {
		const response = await renderPage({
			pageModule: page as Parameters<typeof renderPage>[0]["pageModule"],
			template: TestTemplate,
			request: defaultRequest,
			params: defaultParams,
			appContext: defaultAppContext,
			slotSources: { header: staticSource, main: interactiveSource, footer: staticSource },
			routePath: "/demo",
		});

		const html = await response.text();

		expect(html).toContain("/demo");
	});
});
