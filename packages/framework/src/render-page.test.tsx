import React from "react";
import { describe, expect, test } from "vitest";

import type { SlotMap, TemplateComponent } from "./core/index";
import { renderPage } from "./render-page";
import { Slot } from "./slot";

function makeTemplate(body: React.ReactNode): TemplateComponent {
	return function Template({ head }: { head: React.ReactNode }): React.ReactNode {
		return (
			<html lang="en">
				<head>{head}</head>
				<body>{body}</body>
			</html>
		);
	};
}

function makeTemplateWithSlot(): TemplateComponent {
	return function Template({ head }: { head: React.ReactNode }): React.ReactNode {
		return (
			<html lang="en">
				<head>{head}</head>
				<body>
					<Slot id="content" />
				</body>
			</html>
		);
	};
}

describe("renderPage", () => {
	test("renders a basic page with one slot and no meta", async () => {
		const response = renderPage({
			pageModule: {
				defineSlots: () => ({ content: <p>Hello World</p> }),
			},
			template: makeTemplateWithSlot(),
			loaderData: {},
		});

		expect(response).toBeInstanceOf(Response);
		const html = await response.text();
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("<p>Hello World</p>");
		expect(html).toContain('<meta charSet="utf-8"/>');
		expect(html).toContain("width=device-width");
	});

	test("includes static meta title and description in head", async () => {
		const response = renderPage({
			pageModule: {
				defineSlots: () => ({}),
				meta: { title: "My Page", description: "A great page" },
			},
			template: makeTemplate(<main>content</main>),
			loaderData: {},
		});

		const html = await response.text();
		expect(html).toContain("<title>My Page</title>");
		expect(html).toContain('content="A great page"');
	});

	test("resolves dynamic meta from function form", async () => {
		const response = renderPage({
			pageModule: {
				defineSlots: () => ({}),
				meta: ({ loaderData }: { loaderData: unknown }) => {
					const { name } = loaderData as { name: string };
					return {
						title: `Hello ${name}`,
						description: `Page for ${name}`,
					};
				},
			},
			template: makeTemplate(<div />),
			loaderData: { name: "Alice" },
		});

		const html = await response.text();
		expect(html).toContain("<title>Hello Alice</title>");
		expect(html).toContain('content="Page for Alice"');
	});

	test("renders head with charset and viewport when no meta provided", async () => {
		const response = renderPage({
			pageModule: {
				defineSlots: () => ({}),
			},
			template: makeTemplate(<div />),
			loaderData: {},
		});

		const html = await response.text();
		expect(html).toContain('<meta charSet="utf-8"/>');
		expect(html).toContain("width=device-width");
		expect(html).not.toContain("<title>");
	});

	test("includes CSS link tag when cssHref is provided", async () => {
		const response = renderPage({
			pageModule: {
				defineSlots: () => ({}),
			},
			template: makeTemplate(<div />),
			loaderData: {},
			cssHref: "/styles/main.css",
		});

		const html = await response.text();
		expect(html).toContain('href="/styles/main.css"');
		expect(html).toContain('rel="stylesheet"');
	});

	test("renders multiple slots correctly", async () => {
		function MultiSlotTemplate({ head }: { head: React.ReactNode }): React.ReactNode {
			return (
				<html lang="en">
					<head>{head}</head>
					<body>
						<Slot id="header" />
						<Slot id="main" />
						<Slot id="footer" />
					</body>
				</html>
			);
		}

		const response = renderPage({
			pageModule: {
				defineSlots: (): SlotMap => ({
					header: <header>Nav</header>,
					main: <main>Content</main>,
					footer: <footer>Foot</footer>,
				}),
			},
			template: MultiSlotTemplate,
			loaderData: {},
		});

		const html = await response.text();
		expect(html).toContain("<header>Nav</header>");
		expect(html).toContain("<main>Content</main>");
		expect(html).toContain("<footer>Foot</footer>");
	});

	test("returns response with correct content-type header", () => {
		const response = renderPage({
			pageModule: {
				defineSlots: () => ({}),
			},
			template: makeTemplate(<div />),
			loaderData: {},
		});

		expect(response.headers.get("content-type")).toBe("text/html;charset=utf-8");
	});

	test("includes view-transition meta tag when viewTransition is true", async () => {
		const response = renderPage({
			pageModule: {
				defineSlots: () => ({}),
			},
			template: makeTemplate(<div />),
			loaderData: {},
			viewTransition: true,
		});

		const html = await response.text();
		expect(html).toContain('name="view-transition"');
		expect(html).toContain('content="same-origin"');
	});

	test("does not include view-transition meta tag when viewTransition is omitted", async () => {
		const response = renderPage({
			pageModule: {
				defineSlots: () => ({}),
			},
			template: makeTemplate(<div />),
			loaderData: {},
		});

		const html = await response.text();
		expect(html).not.toContain('name="view-transition"');
	});

	test("passes loaderData to defineSlots", async () => {
		const response = renderPage({
			pageModule: {
				defineSlots: ({ loaderData }: { loaderData: unknown }): SlotMap => {
					const { items } = loaderData as { items: string[] };
					return {
						content: (
							<ul>
								{items.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						),
					};
				},
			},
			template: makeTemplateWithSlot(),
			loaderData: { items: ["a", "b", "c"] },
		});

		const html = await response.text();
		expect(html).toContain("<li>a</li>");
		expect(html).toContain("<li>b</li>");
		expect(html).toContain("<li>c</li>");
	});
});
