import React from "react";
import { describe, expect, test } from "vitest";

import type { Context, SlotMap, TemplateComponent } from "./core/index";
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

function makeRequest(url = "https://example.com/"): Request {
	return new Request(url);
}

describe("renderPage", () => {
	test("runs loader and produces complete HTML response", async () => {
		const response = await renderPage({
			pageModule: {
				loader: (ctx: Context) => ({ slug: ctx.params.slug }),
				defineSlots: ({ loaderData }: { loaderData: unknown }) => {
					const { slug } = loaderData as { slug: string };
					return { content: <p>{slug}</p> };
				},
			},
			template: makeTemplateWithSlot(),
			request: makeRequest("https://example.com/blog/hello"),
			params: { slug: "hello" },
			appContext: {},
		});

		expect(response).toBeInstanceOf(Response);
		const html = await response.text();
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("<p>hello</p>");
		expect(html).toContain('<meta charSet="utf-8"/>');
		expect(html).toContain("width=device-width");
	});

	test("renders with undefined loaderData when page has no loader", async () => {
		const response = await renderPage({
			pageModule: {
				defineSlots: () => ({ content: <p>Static</p> }),
			},
			template: makeTemplateWithSlot(),
			request: makeRequest(),
			params: {},
			appContext: {},
		});

		expect(response).toBeInstanceOf(Response);
		const html = await response.text();
		expect(html).toContain("<p>Static</p>");
	});

	test("static meta object produces correct title and description in output", async () => {
		const response = await renderPage({
			pageModule: {
				defineSlots: () => ({}),
				meta: { title: "My Page", description: "A great page" },
			},
			template: makeTemplate(<main>content</main>),
			request: makeRequest(),
			params: {},
			appContext: {},
		});

		const html = await response.text();
		expect(html).toContain("<title>My Page</title>");
		expect(html).toContain('content="A great page"');
	});

	test("dynamic meta function receives loaderData and produces correct head content", async () => {
		const response = await renderPage({
			pageModule: {
				loader: () => ({ name: "Alice" }),
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
			request: makeRequest(),
			params: {},
			appContext: {},
		});

		const html = await response.text();
		expect(html).toContain("<title>Hello Alice</title>");
		expect(html).toContain('content="Page for Alice"');
	});

	test("loader receives merged request context with params, appContext, and request", async () => {
		let capturedCtx: Context | undefined;

		const request = makeRequest("https://example.com/blog/hello");
		const response = await renderPage({
			pageModule: {
				loader: (ctx: Context) => {
					capturedCtx = ctx;
					return {};
				},
				defineSlots: () => ({}),
			},
			template: makeTemplate(<div />),
			request,
			params: { slug: "hello" },
			appContext: { db: "test-db" },
		});

		expect(response).toBeInstanceOf(Response);
		expect(capturedCtx).toBeDefined();
		expect(capturedCtx!.params).toEqual({ slug: "hello" });
		expect(capturedCtx!.request).toBe(request);
		expect((capturedCtx as Record<string, unknown>).db).toBe("test-db");
	});

	test("renders head with charset and viewport when no meta provided", async () => {
		const response = await renderPage({
			pageModule: {
				defineSlots: () => ({}),
			},
			template: makeTemplate(<div />),
			request: makeRequest(),
			params: {},
			appContext: {},
		});

		const html = await response.text();
		expect(html).toContain('<meta charSet="utf-8"/>');
		expect(html).toContain("width=device-width");
		expect(html).not.toContain("<title>");
	});

	test("includes CSS link tag when cssHref is provided", async () => {
		const response = await renderPage({
			pageModule: {
				defineSlots: () => ({}),
			},
			template: makeTemplate(<div />),
			request: makeRequest(),
			params: {},
			appContext: {},
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

		const response = await renderPage({
			pageModule: {
				defineSlots: (): SlotMap => ({
					header: <header>Nav</header>,
					main: <main>Content</main>,
					footer: <footer>Foot</footer>,
				}),
			},
			template: MultiSlotTemplate,
			request: makeRequest(),
			params: {},
			appContext: {},
		});

		const html = await response.text();
		expect(html).toContain("<header>Nav</header>");
		expect(html).toContain("<main>Content</main>");
		expect(html).toContain("<footer>Foot</footer>");
	});

	test("returns response with correct content-type header", async () => {
		const response = await renderPage({
			pageModule: {
				defineSlots: () => ({}),
			},
			template: makeTemplate(<div />),
			request: makeRequest(),
			params: {},
			appContext: {},
		});

		expect(response.headers.get("content-type")).toBe("text/html;charset=utf-8");
	});

	test("includes view-transition meta tag when hasViewTransition is true", async () => {
		const response = await renderPage({
			pageModule: {
				defineSlots: () => ({}),
			},
			template: makeTemplate(<div />),
			request: makeRequest(),
			params: {},
			appContext: {},
			hasViewTransition: true,
		});

		const html = await response.text();
		expect(html).toContain('name="view-transition"');
		expect(html).toContain('content="same-origin"');
	});

	test("does not include view-transition meta tag when hasViewTransition is omitted", async () => {
		const response = await renderPage({
			pageModule: {
				defineSlots: () => ({}),
			},
			template: makeTemplate(<div />),
			request: makeRequest(),
			params: {},
			appContext: {},
		});

		const html = await response.text();
		expect(html).not.toContain('name="view-transition"');
	});

	test("passes loaderData to defineSlots", async () => {
		const response = await renderPage({
			pageModule: {
				loader: () => ({ items: ["a", "b", "c"] }),
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
			request: makeRequest(),
			params: {},
			appContext: {},
		});

		const html = await response.text();
		expect(html).toContain("<li>a</li>");
		expect(html).toContain("<li>b</li>");
		expect(html).toContain("<li>c</li>");
	});

	test("handles async loaders", async () => {
		const response = await renderPage({
			pageModule: {
				loader: (ctx: Context) => Promise.resolve({ url: ctx.request.url }),
				defineSlots: ({ loaderData }: { loaderData: unknown }) => {
					const { url } = loaderData as { url: string };
					return { content: <p>{url}</p> };
				},
			},
			template: makeTemplateWithSlot(),
			request: makeRequest("https://example.com/async"),
			params: {},
			appContext: {},
		});

		const html = await response.text();
		expect(html).toContain("<p>https://example.com/async</p>");
	});

	test("propagates errors thrown by the loader", async () => {
		await expect(
			renderPage({
				pageModule: {
					loader: () => {
						throw new Error("loader failed");
					},
					defineSlots: () => ({}),
				},
				template: makeTemplate(<div />),
				request: makeRequest(),
				params: {},
				appContext: {},
			}),
		).rejects.toThrow("loader failed");
	});

	test("renders only title when description is omitted from meta", async () => {
		const response = await renderPage({
			pageModule: {
				defineSlots: () => ({}),
				meta: { title: "Only Title" },
			},
			template: makeTemplate(<div />),
			request: makeRequest(),
			params: {},
			appContext: {},
		});

		const html = await response.text();
		expect(html).toContain("<title>Only Title</title>");
		expect(html).not.toContain('name="description"');
	});

	test("renders only description when title is omitted from meta", async () => {
		const response = await renderPage({
			pageModule: {
				defineSlots: () => ({}),
				meta: { description: "Only desc" },
			},
			template: makeTemplate(<div />),
			request: makeRequest(),
			params: {},
			appContext: {},
		});

		const html = await response.text();
		expect(html).not.toContain("<title>");
		expect(html).toContain('content="Only desc"');
		expect(html).toContain('name="description"');
	});
});
