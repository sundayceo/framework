import { describe, expect, test } from "vitest";

import { extractSlotModules } from "./slot-extraction";

describe("extractSlotModules", () => {
	test("inline JSX with loaderData: extracts slots with correct loaderData param", () => {
		const source = `
import React from "react";
import { definePage } from "@sundayceo/framework";

export default definePage("/demo")({
  template: "default",
  loader: () => ({ title: "hello" }),
  defineSlots: ({ loaderData }) => ({
    header: <h1>{loaderData.title}</h1>,
    footer: <p>Static footer</p>,
  }),
});
`;

		const result = extractSlotModules(source, "/demo");

		expect(result.size).toBe(2);

		const header = result.get("virtual:hydrate/demo/header")!;
		expect(header).toContain("{ loaderData }");
		expect(header).toContain("loaderData.title");

		const footer = result.get("virtual:hydrate/demo/footer")!;
		expect(footer).not.toContain("{ loaderData }");
		expect(footer).toContain("Static footer");
	});

	test("imported component: virtual module imports only referenced component", () => {
		const source = `
import React from "react";
import { definePage } from "@sundayceo/framework";
import Counter from "../components/Counter";

export default definePage("/demo")({
  template: "default",
  loader: () => ({ description: "count things" }),
  defineSlots: ({ loaderData }) => ({
    header: <h1>Demo</h1>,
    main: <Counter label={loaderData.description} />,
    footer: <p>footer</p>,
  }),
});
`;

		const result = extractSlotModules(source, "/demo");

		const main = result.get("virtual:hydrate/demo/main")!;
		expect(main).toContain("Counter");
		expect(main).toContain('import Counter from "../components/Counter"');

		const header = result.get("virtual:hydrate/demo/header")!;
		expect(header).not.toContain("Counter");
	});

	test("block body with locals: hoists required locals and transitive imports", () => {
		const source = `
import React from "react";
import { definePage } from "@sundayceo/framework";
import { formatDate } from "../utils/format";

export default definePage("/blog/[slug]")({
  template: "default",
  loader: ({ params }) => ({ slug: params.slug, date: "2026-01-01" }),
  defineSlots: ({ loaderData }) => {
    const formatted = formatDate(loaderData.date);
    const slug = loaderData.slug;
    return {
      header: <h1>Post: {slug}</h1>,
      main: <p>Published: {formatted}</p>,
      footer: <p>footer</p>,
    };
  },
});
`;

		const result = extractSlotModules(source, "/blog/[slug]");

		const main = result.get("virtual:hydrate/blog/[slug]/main")!;
		expect(main).toContain("formatted");
		expect(main).toContain("formatDate");
		expect(main).toContain("{ loaderData }");

		const footer = result.get("virtual:hydrate/blog/[slug]/footer")!;
		expect(footer).not.toContain("formatDate");
		expect(footer).not.toContain("{ loaderData }");
	});

	test("multi-component JSX: virtual module imports all referenced components", () => {
		const source = `
import React from "react";
import { definePage } from "@sundayceo/framework";
import Counter from "../components/Counter";
import Badge from "../components/Badge";

export default definePage("/complex")({
  template: "default",
  loader: () => ({ count: 5, label: "clicks" }),
  defineSlots: ({ loaderData }) => ({
    main: <div><Counter initial={loaderData.count} /><Badge text={loaderData.label} /></div>,
    footer: <p>plain</p>,
  }),
});
`;

		const result = extractSlotModules(source, "/complex");

		const main = result.get("virtual:hydrate/complex/main")!;
		expect(main).toContain("Counter");
		expect(main).toContain("Badge");

		const footer = result.get("virtual:hydrate/complex/footer")!;
		expect(footer).not.toContain("Counter");
		expect(footer).not.toContain("Badge");
	});

	test("conditional expression: both branches' deps included", () => {
		const source = `
import React from "react";
import { definePage } from "@sundayceo/framework";
import Counter from "../components/Counter";
import Fallback from "../components/Fallback";

export default definePage("/cond")({
  template: "default",
  loader: () => ({ show: true }),
  defineSlots: ({ loaderData }) => ({
    main: loaderData.show ? <Counter /> : <Fallback />,
  }),
});
`;

		const result = extractSlotModules(source, "/cond");

		const main = result.get("virtual:hydrate/cond/main")!;
		expect(main).toContain("Counter");
		expect(main).toContain("Fallback");
	});

	test("no defineSlots property: returns empty map", () => {
		const source = `
import { defineHandler } from "@sundayceo/framework";

export default defineHandler({
  GET: () => new Response("ok"),
});
`;

		const result = extractSlotModules(source, "/api/test");
		expect(result.size).toBe(0);
	});

	test("slot with JSX fragment: wraps fragment correctly", () => {
		const source = `
import React from "react";
import { definePage } from "@sundayceo/framework";

export default definePage("/frag")({
  template: "default",
  defineSlots: () => ({
    main: <><p>First</p><p>Second</p></>,
  }),
});
`;

		const result = extractSlotModules(source, "/frag");
		const main = result.get("virtual:hydrate/frag/main")!;
		expect(main).toContain("First");
		expect(main).toContain("Second");
		expect(main).toContain("HydrateSlot()");
	});

	test("defineSlots as non-function value: returns empty map", () => {
		const source = `
import React from "react";
import { definePage } from "@sundayceo/framework";

export default definePage("/test")({
  template: "default",
  defineSlots: "not-a-function",
});
`;

		const result = extractSlotModules(source, "/test");
		expect(result.size).toBe(0);
	});

	test("numeric property key in slots is skipped", () => {
		const source = `
import React from "react";
import { definePage } from "@sundayceo/framework";

export default definePage("/num")({
  template: "default",
  defineSlots: () => ({
    0: <p>numeric key</p>,
    header: <h1>Static</h1>,
  }),
});
`;

		const result = extractSlotModules(source, "/num");
		// Numeric key produces a NumericLiteral, which is skipped
		expect(result.has("virtual:hydrate/num/header")).toBe(true);
		expect(result.size).toBe(1);
	});

	test("string literal key in slots is extracted", () => {
		const source = `
import React from "react";
import { definePage } from "@sundayceo/framework";

export default definePage("/str")({
  template: "default",
  defineSlots: () => ({
    "my-slot": <p>String key</p>,
  }),
});
`;

		const result = extractSlotModules(source, "/str");
		expect(result.has("virtual:hydrate/str/my-slot")).toBe(true);
	});

	test("spread element in slots object is skipped", () => {
		const source = `
import React from "react";
import { definePage } from "@sundayceo/framework";

const extra = { sidebar: <p>Extra</p> };
export default definePage("/spread")({
  template: "default",
  defineSlots: () => ({
    ...extra,
    header: <h1>Main</h1>,
  }),
});
`;

		const result = extractSlotModules(source, "/spread");
		expect(result.has("virtual:hydrate/spread/header")).toBe(true);
		// spread is not an ObjectProperty, so it's skipped
	});

	test("arrow body returning non-object expression returns empty map", () => {
		const source = `
import React from "react";
import { definePage } from "@sundayceo/framework";

export default definePage("/expr")({
  template: "default",
  defineSlots: () => null,
});
`;

		const result = extractSlotModules(source, "/expr");
		expect(result.size).toBe(0);
	});

	test("block body without return statement returns empty map", () => {
		const source = `
import React from "react";
import { definePage } from "@sundayceo/framework";

export default definePage("/noop")({
  template: "default",
  defineSlots: () => {
    const x = 1;
  },
});
`;

		const result = extractSlotModules(source, "/noop");
		expect(result.size).toBe(0);
	});

	test("block body with local not referencing loaderData", () => {
		const source = `
import React from "react";
import { definePage } from "@sundayceo/framework";

export default definePage("/local")({
  template: "default",
  loader: () => ({ title: "hi" }),
  defineSlots: ({ loaderData }) => {
    const prefix = "Hello";
    return {
      main: <p>{prefix}</p>,
    };
  },
});
`;

		const result = extractSlotModules(source, "/local");
		const main = result.get("virtual:hydrate/local/main");
		expect(main).toBeDefined();
		// The local "prefix" does not use loaderData, so the slot has no loaderData param
		expect(main).toContain("HydrateSlot()");
	});

	test("slot without loaderData: virtual module has no param", () => {
		const source = `
import React from "react";
import { definePage } from "@sundayceo/framework";

export default definePage("/static")({
  template: "default",
  defineSlots: () => ({
    content: <p>Fully static</p>,
  }),
});
`;

		const result = extractSlotModules(source, "/static");
		const content = result.get("virtual:hydrate/static/content")!;
		expect(content).toContain("HydrateSlot()");
		expect(content).not.toContain("loaderData");
	});
});
