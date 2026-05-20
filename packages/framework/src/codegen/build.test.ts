import { describe, expect, test } from "vitest";

import { buildClientEntries, codegen } from "./build";

describe("codegen", () => {
	test("manifest includes hydration manifest when route sources provided", () => {
		const { manifest } = codegen({
			routePaths: ["index.tsx"],
			templatePaths: [],
			routeSources: {
				"/": 'import { useState } from "react";\nexport default definePage("/")({ template: "default", loader: () => ({}), defineSlots: () => ({ main: { Component: () => { const [x] = useState(0); return x; } } }) });',
			},
		});

		expect(manifest).toContain("export const hydrationManifest = ");
		expect(manifest).toContain('"/"');
	});

	test("returns empty clientEntries when no route sources provided", () => {
		const { clientEntries } = codegen({
			routePaths: ["index.tsx"],
			templatePaths: [],
		});

		expect(clientEntries).toEqual([]);
	});

	test("buildClientEntries returns empty when route source is missing", () => {
		const result = buildClientEntries({}, { "/missing": { main: true } });

		expect(result).toEqual([]);
	});

	test("returns structured clientEntries for interactive slots", () => {
		const { clientEntries } = codegen({
			routePaths: ["demo.tsx"],
			templatePaths: [],
			routeSources: {
				"/demo": [
					'import React from "react";',
					'import { Counter } from "./components/counter";',
					'import { definePage } from "@sundayceo/framework";',
					'export default definePage("/demo")({',
					'  template: "default",',
					"  loader: () => ({}),",
					"  defineSlots: () => ({",
					"    main: <Counter />,",
					"  }),",
					"});",
				].join("\n"),
			},
			importGraph: {
				"./components/counter":
					'import { useState } from "react";\nexport function Counter() { const [c, setC] = useState(0); return <button>{c}</button>; }',
			},
		});

		expect(clientEntries).toHaveLength(1);
		const entry = clientEntries.at(0);
		expect(entry?.routePath).toBe("/demo");
		expect(entry?.slotName).toBe("main");
		expect(entry?.moduleSource).toContain("HydrateSlot");
	});
});
