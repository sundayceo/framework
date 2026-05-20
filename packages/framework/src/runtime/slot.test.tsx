import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { Slot, SlotContext, SlotProvider } from "./slot";

describe("SlotContext", () => {
	test("has an empty object as default value", () => {
		function Inspector(): React.ReactNode {
			const { slots } = React.useContext(SlotContext);
			return <span data-slots={JSON.stringify(slots)} />;
		}
		const html = renderToString(<Inspector />);
		expect(html).toContain('data-slots="{}"');
	});
});

describe("SlotProvider", () => {
	test("provides slots to children via context", () => {
		function Inspector(): React.ReactNode {
			const { slots } = React.useContext(SlotContext);
			return <>{slots.content}</>;
		}
		const html = renderToString(
			<SlotProvider slots={{ content: <p>Hello</p> }}>
				<Inspector />
			</SlotProvider>,
		);
		expect(html).toContain("<p>Hello</p>");
	});
});

describe("Slot", () => {
	test("renders matching content from context", () => {
		const html = renderToString(
			<SlotProvider slots={{ header: <h1>Title</h1> }}>
				<Slot id="header" />
			</SlotProvider>,
		);
		expect(html).toContain("<h1>Title</h1>");
	});

	test("renders fallback when slot is not provided", () => {
		const html = renderToString(
			<SlotProvider slots={{}}>
				<Slot id="footer" fallback={<footer>Default Footer</footer>} />
			</SlotProvider>,
		);
		expect(html).toContain("<footer>Default Footer</footer>");
	});

	test("renders nothing when slot is not provided and no fallback", () => {
		const html = renderToString(
			<SlotProvider slots={{}}>
				<Slot id="sidebar" />
			</SlotProvider>,
		);
		expect(html).toBe('<div data-slot="sidebar"></div>');
	});

	test("renders static data-slot wrapper when no hydration metadata", () => {
		const html = renderToString(
			<SlotProvider slots={{ main: <p>Static</p> }}>
				<Slot id="main" />
			</SlotProvider>,
		);
		expect(html).toContain('data-slot="main"');
		expect(html).not.toContain("data-hydrate");
		expect(html).not.toContain("<script");
	});

	test("renders data-hydrate wrapper with scripts for interactive slot", () => {
		const html = renderToString(
			<SlotProvider
				slots={{ counter: <button>Count: 0</button> }}
				hydration={{
					interactivity: { counter: true },
					serializedData: '{"count":0}',
					routePath: "/demo",
				}}
			>
				<Slot id="counter" />
			</SlotProvider>,
		);
		expect(html).toContain('data-hydrate="counter"');
		expect(html).toContain("<button>Count: 0</button>");
		expect(html).toContain('data-hydrate-data="counter"');
		expect(html).toContain('{"count":0}');
		expect(html).toContain('<script type="module">');
		expect(html).toContain("virtual:hydrate/demo/counter");
	});

	test("renders static wrapper for non-interactive slot when hydration is present", () => {
		const html = renderToString(
			<SlotProvider
				slots={{ header: <h1>Title</h1>, counter: <button>Click</button> }}
				hydration={{
					interactivity: { header: false, counter: true },
					serializedData: "{}",
					routePath: "/demo",
				}}
			>
				<Slot id="header" />
			</SlotProvider>,
		);
		expect(html).toContain('data-slot="header"');
		expect(html).not.toContain('data-hydrate="header"');
	});

	test("uses asset path override when provided", () => {
		const html = renderToString(
			<SlotProvider
				slots={{ main: <div>Content</div> }}
				hydration={{
					interactivity: { main: true },
					serializedData: "{}",
					assetPaths: { main: "/assets/main-abc123.js" },
					routePath: "/demo",
				}}
			>
				<Slot id="main" />
			</SlotProvider>,
		);
		expect(html).toContain("/assets/main-abc123.js");
		expect(html).not.toContain("virtual:hydrate");
	});

	test("multiple interactive slots each get their own scripts", () => {
		const html = renderToString(
			<SlotProvider
				slots={{
					header: <h1>H</h1>,
					main: <p>M</p>,
					footer: <footer>F</footer>,
				}}
				hydration={{
					interactivity: { header: true, main: true, footer: true },
					serializedData: "{}",
					routePath: "/full",
				}}
			>
				<Slot id="header" />
				<Slot id="main" />
				<Slot id="footer" />
			</SlotProvider>,
		);
		expect(html).toContain('data-hydrate="header"');
		expect(html).toContain('data-hydrate="main"');
		expect(html).toContain('data-hydrate="footer"');

		const moduleScripts = html.match(/<script type="module">/g) ?? [];
		expect(moduleScripts.length).toBe(3);

		const dataScripts = html.match(/data-hydrate-data="/g) ?? [];
		expect(dataScripts.length).toBe(3);
	});
});
