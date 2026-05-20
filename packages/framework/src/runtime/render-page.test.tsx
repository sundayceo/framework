import React from "react";
import { describe, expect, test, vi } from "vitest";

import { renderPage } from "./render-page";
import { Slot } from "./slot";
import type { Context, SlotMap, TemplateComponent } from "./types";

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

	test("renders empty head content when no meta provided", async () => {
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
		expect(html).not.toContain("<title>");
		expect(html).not.toContain('name="description"');
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

	test("view-transition meta tag is controlled by hasViewTransition flag", async () => {
		const withTransition = await renderPage({
			pageModule: { defineSlots: () => ({}) },
			template: makeTemplate(<div />),
			request: makeRequest(),
			params: {},
			appContext: {},
			hasViewTransition: true,
		});

		const htmlWith = await withTransition.text();
		expect(htmlWith).toContain('name="view-transition"');
		expect(htmlWith).toContain('content="same-origin"');

		const withoutTransition = await renderPage({
			pageModule: { defineSlots: () => ({}) },
			template: makeTemplate(<div />),
			request: makeRequest(),
			params: {},
			appContext: {},
		});

		const htmlWithout = await withoutTransition.text();
		expect(htmlWithout).not.toContain('name="view-transition"');
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

	describe("slot validation", () => {
		test("throws when a required slot is not provided", async () => {
			function TwoSlotTemplate({ head }: { head: React.ReactNode }): React.ReactNode {
				return (
					<html lang="en">
						<head>{head}</head>
						<body>
							<Slot id="header" />
							<Slot id="content" />
						</body>
					</html>
				);
			}

			await expect(
				renderPage({
					pageModule: {
						defineSlots: () => ({ header: <h1>Hi</h1> }),
					},
					template: TwoSlotTemplate,
					request: makeRequest(),
					params: {},
					appContext: {},
				}),
			).rejects.toThrow('Required slot "content" is missing');
		});

		test("does not throw when optional slot with fallback is not provided", async () => {
			function OptionalSlotTemplate({ head }: { head: React.ReactNode }): React.ReactNode {
				return (
					<html lang="en">
						<head>{head}</head>
						<body>
							<Slot id="content" />
							<Slot id="sidebar" fallback={<nav>Default</nav>} />
						</body>
					</html>
				);
			}

			const response = await renderPage({
				pageModule: {
					defineSlots: () => ({ content: <p>Main</p> }),
				},
				template: OptionalSlotTemplate,
				request: makeRequest(),
				params: {},
				appContext: {},
			});

			const html = await response.text();
			expect(html).toContain("<p>Main</p>");
			expect(html).toContain("<nav>Default</nav>");
		});
	});

	describe("slot validation warnings", () => {
		test("logs console.warn for typo slot name with suggestion", async () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(vi.fn());

			function Template({ head }: { head: React.ReactNode }): React.ReactNode {
				return (
					<html lang="en">
						<head>{head}</head>
						<body>
							<Slot id="header" />
							<Slot id="content" fallback={<p>fallback</p>} />
						</body>
					</html>
				);
			}

			await renderPage({
				pageModule: {
					defineSlots: () => ({ header: <h1>Hi</h1>, contentt: <p>Typo</p> }),
				},
				template: Template,
				request: makeRequest(),
				params: {},
				appContext: {},
			});

			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown slot "contentt"'));
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Did you mean "content"'));

			warnSpy.mockRestore();
		});

		test("logs console.warn for unknown slot with no close match listing available slots", async () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(vi.fn());

			function Template({ head }: { head: React.ReactNode }): React.ReactNode {
				return (
					<html lang="en">
						<head>{head}</head>
						<body>
							<Slot id="header" />
							<Slot id="content" fallback={<p>fallback</p>} />
						</body>
					</html>
				);
			}

			await renderPage({
				pageModule: {
					defineSlots: () => ({ header: <h1>Hi</h1>, "completely-unrelated": <p>?</p> }),
				},
				template: Template,
				request: makeRequest(),
				params: {},
				appContext: {},
			});

			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Unknown slot "completely-unrelated"'),
			);
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Available slots"));

			warnSpy.mockRestore();
		});

		test("does not log warnings when all slots are valid", async () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(vi.fn());

			await renderPage({
				pageModule: {
					defineSlots: () => ({ content: <p>OK</p> }),
				},
				template: makeTemplateWithSlot(),
				request: makeRequest(),
				params: {},
				appContext: {},
			});

			expect(warnSpy).not.toHaveBeenCalled();

			warnSpy.mockRestore();
		});
	});

	describe("hydration integration", () => {
		test("interactive slot gets hydration script injected", async () => {
			const response = await renderPage({
				pageModule: {
					defineSlots: () => ({ content: <button>Count: 0</button> }),
				},
				template: makeTemplateWithSlot(),
				request: makeRequest(),
				params: {},
				appContext: {},
				slotInteractivity: { content: true },
				routePath: "/routes/index",
			});

			const html = await response.text();
			expect(html).toContain('data-hydrate="content"');
			expect(html).toContain('<script type="module">');
			expect(html).toContain('<script type="application/json" data-hydrate-data="content">');
		});

		test("no hydration when slotInteractivity is omitted", async () => {
			const response = await renderPage({
				pageModule: {
					defineSlots: () => ({ content: <button>Count: 0</button> }),
				},
				template: makeTemplateWithSlot(),
				request: makeRequest(),
				params: {},
				appContext: {},
			});

			const html = await response.text();
			expect(html).toContain("<button>Count: 0</button>");
			expect(html).not.toContain("<script");
			expect(html).not.toContain("data-hydrate=");
		});

		test("asset paths override default virtual module IDs", async () => {
			const response = await renderPage({
				pageModule: {
					defineSlots: () => ({ content: <button>Click</button> }),
				},
				template: makeTemplateWithSlot(),
				request: makeRequest(),
				params: {},
				appContext: {},
				slotInteractivity: { content: true },
				assetPaths: { content: "/assets/content-abc123.js" },
				routePath: "/routes/index",
			});

			const html = await response.text();
			expect(html).toContain("/assets/content-abc123.js");
		});
	});
});
