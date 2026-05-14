import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { Slot, SlotContext, SlotProvider } from "./slot";

describe("SlotContext", () => {
	test("has an empty object as default value", () => {
		function Inspector(): React.ReactNode {
			const slots = React.useContext(SlotContext);
			return <span data-slots={JSON.stringify(slots)} />;
		}
		const html = renderToString(<Inspector />);
		expect(html).toContain('data-slots="{}"');
	});
});

describe("SlotProvider", () => {
	test("provides slots to children via context", () => {
		function Inspector(): React.ReactNode {
			const slots = React.useContext(SlotContext);
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
		expect(html).toBe("");
	});
});
