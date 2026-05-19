import { describe, expect, test } from "vitest";

import { buildClientEntries } from "./build-client-entries";

describe("buildClientEntries", () => {
	test("returns virtual module IDs for interactive slots only", () => {
		const manifest = {
			"/demo": { header: false, main: true, footer: false },
			"/blog": { content: true, sidebar: true },
		};

		const entries = buildClientEntries(manifest);

		expect(entries).toEqual([
			"virtual:hydrate/demo/main",
			"virtual:hydrate/blog/content",
			"virtual:hydrate/blog/sidebar",
		]);
	});

	test("returns empty array when no interactive slots", () => {
		const manifest = {
			"/about": { header: false, content: false },
		};

		const entries = buildClientEntries(manifest);

		expect(entries).toEqual([]);
	});

	test("returns empty array for empty manifest", () => {
		const entries = buildClientEntries({});

		expect(entries).toEqual([]);
	});
});
