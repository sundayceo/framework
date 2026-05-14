import { describe, expect, test } from "vitest";

import { resolveMeta } from "./resolve-meta";

describe("resolveMeta", () => {
	test("returns static meta object as-is", () => {
		const result = resolveMeta({
			meta: { title: "About", description: "About us" },
			loaderData: {},
		});

		expect(result).toEqual({ title: "About", description: "About us" });
	});

	test("calls dynamic meta function with loaderData", () => {
		const result = resolveMeta({
			meta: ({ loaderData }: { loaderData: unknown }) => {
				const data = loaderData as { name: string };
				return { title: data.name, description: `Page for ${data.name}` };
			},
			loaderData: { name: "Alice" },
		});

		expect(result).toEqual({ title: "Alice", description: "Page for Alice" });
	});

	test("returns empty object when meta is undefined", () => {
		const result = resolveMeta({
			meta: undefined,
			loaderData: {},
		});

		expect(result).toEqual({});
	});

	test("handles partial static meta with only title", () => {
		const result = resolveMeta({
			meta: { title: "Only Title" },
			loaderData: {},
		});

		expect(result).toEqual({ title: "Only Title" });
	});

	test("handles partial static meta with only description", () => {
		const result = resolveMeta({
			meta: { description: "Only desc" },
			loaderData: {},
		});

		expect(result).toEqual({ description: "Only desc" });
	});

	test("handles dynamic meta returning partial result", () => {
		const result = resolveMeta({
			meta: () => ({ title: "Dynamic Only" }),
			loaderData: {},
		});

		expect(result).toEqual({ title: "Dynamic Only" });
	});
});
