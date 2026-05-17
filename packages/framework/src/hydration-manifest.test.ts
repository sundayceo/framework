import { describe, expect, test } from "vitest";

import { buildHydrationManifest, serializeManifest } from "./hydration-manifest";

describe("buildHydrationManifest", () => {
	test("identifies interactive slots via hook usage", () => {
		const routes = [
			{
				routePath: "/demo",
				source: `
import React from "react";
import { definePage } from "@sundayceo/framework";
import Counter from "../components/Counter";

export default definePage("/demo")({
  template: "default",
  loader: () => ({ count: 0 }),
  defineSlots: ({ loaderData }) => ({
    header: <h1>Static</h1>,
    main: <Counter initial={loaderData.count} />,
  }),
});
`,
			},
		];

		const importGraph: Record<string, string> = {
			"../components/Counter": `import { useState } from "react";\nexport default function Counter() { const [c, setC] = useState(0); return <button onClick={() => setC(c+1)}>{c}</button>; }`,
		};

		const manifest = buildHydrationManifest({ routes, importGraph });

		expect(manifest).toEqual({
			"/demo": { header: false, main: true },
		});
	});

	test("handler route without defineSlots is omitted from manifest", () => {
		const routes = [
			{
				routePath: "/api/health",
				source: `
import { defineHandler } from "@sundayceo/framework";

export default defineHandler({
  GET: () => new Response("ok"),
});
`,
			},
		];

		const manifest = buildHydrationManifest({ routes, importGraph: {} });

		expect(manifest).toEqual({});
	});

	test("fully static page has all-false entries", () => {
		const routes = [
			{
				routePath: "/about",
				source: `
import React from "react";
import { definePage } from "@sundayceo/framework";

export default definePage("/about")({
  template: "default",
  defineSlots: () => ({
    header: <h1>About</h1>,
    content: <p>Static content</p>,
  }),
});
`,
			},
		];

		const manifest = buildHydrationManifest({ routes, importGraph: {} });

		expect(manifest).toEqual({
			"/about": { header: false, content: false },
		});
	});

	test("serializeManifest produces valid ES module source", () => {
		const manifest = {
			"/demo": { header: false, main: true },
			"/about": { content: false },
		};

		const source = serializeManifest(manifest);

		expect(source).toContain("export default");
		expect(source).toContain('"/demo"');
		expect(source).toContain('"main": true');
		expect(source).toContain('"header": false');
		expect(source).toContain('"/about"');
	});

	test("multiple routes produce combined manifest", () => {
		const routes = [
			{
				routePath: "/",
				source: `
import React from "react";
import { definePage } from "@sundayceo/framework";

export default definePage("/")({
  template: "default",
  defineSlots: () => ({
    hero: <h1>Home</h1>,
  }),
});
`,
			},
			{
				routePath: "/app",
				source: `
import React from "react";
import { definePage } from "@sundayceo/framework";
import Widget from "../components/Widget";

export default definePage("/app")({
  template: "default",
  defineSlots: () => ({
    main: <Widget />,
  }),
});
`,
			},
		];

		const importGraph: Record<string, string> = {
			"../components/Widget": `import { useEffect } from "react";\nexport default function Widget() { useEffect(() => {}, []); return <div />; }`,
		};

		const manifest = buildHydrationManifest({ routes, importGraph });

		expect(manifest).toEqual({
			"/": { hero: false },
			"/app": { main: true },
		});
	});
});
