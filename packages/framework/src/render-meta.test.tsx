import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { renderMeta } from "./render-meta";

describe("renderMeta", () => {
	test("renders title and description when both provided", () => {
		const elements = renderMeta({ meta: { title: "My Page", description: "A great page" } });
		const html = renderToString(<>{elements}</>);

		expect(html).toContain("<title>My Page</title>");
		expect(html).toContain('content="A great page"');
		expect(html).toContain('name="description"');
	});

	test("renders only title when description is omitted", () => {
		const elements = renderMeta({ meta: { title: "Only Title" } });
		const html = renderToString(<>{elements}</>);

		expect(html).toContain("<title>Only Title</title>");
		expect(html).not.toContain('name="description"');
	});

	test("renders only description when title is omitted", () => {
		const elements = renderMeta({ meta: { description: "Only desc" } });
		const html = renderToString(<>{elements}</>);

		expect(html).not.toContain("<title>");
		expect(html).toContain('content="Only desc"');
		expect(html).toContain('name="description"');
	});

	test("renders nothing when both fields are omitted", () => {
		const elements = renderMeta({ meta: {} });
		const html = renderToString(<>{elements}</>);

		expect(html).not.toContain("<title>");
		expect(html).not.toContain('name="description"');
	});

	test("includes view-transition meta tag when viewTransition is true", () => {
		const elements = renderMeta({ meta: {}, viewTransition: true });
		const html = renderToString(<>{elements}</>);

		expect(html).toContain('name="view-transition"');
		expect(html).toContain('content="same-origin"');
	});

	test("does not include view-transition meta tag when viewTransition is omitted", () => {
		const elements = renderMeta({ meta: {} });
		const html = renderToString(<>{elements}</>);

		expect(html).not.toContain('name="view-transition"');
	});
});
