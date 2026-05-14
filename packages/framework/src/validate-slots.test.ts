import { describe, expect, test } from "vitest";

import { validateSlots } from "./validate-slots";

describe("validateSlots", () => {
	test("returns no errors or warnings when all required slots are provided", () => {
		const result = validateSlots({
			providedSlots: ["header", "content", "footer"],
			extractedSlots: {
				slots: ["header", "content", "footer"],
				requiredSlots: ["header", "content"],
			},
		});

		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
	});

	test("returns errors for missing required slots", () => {
		const result = validateSlots({
			providedSlots: ["header"],
			extractedSlots: {
				slots: ["header", "content", "sidebar"],
				requiredSlots: ["header", "content"],
			},
		});

		expect(result.errors).toEqual([
			{
				type: "missing-required-slot",
				slotName: "content",
				message: 'Required slot "content" is missing',
			},
		]);
	});

	test("returns multiple errors when several required slots are missing", () => {
		const result = validateSlots({
			providedSlots: [],
			extractedSlots: {
				slots: ["header", "content", "footer"],
				requiredSlots: ["header", "content"],
			},
		});

		expect(result.errors).toHaveLength(2);
		expect(result.errors.map((e) => e.slotName)).toEqual(["header", "content"]);
	});

	test("returns a warning for unknown provided slots", () => {
		const result = validateSlots({
			providedSlots: ["header", "contentt"],
			extractedSlots: {
				slots: ["header", "content"],
				requiredSlots: ["header", "content"],
			},
		});

		expect(result.warnings).toEqual([
			{
				type: "unknown-slot",
				slotName: "contentt",
				message: 'Unknown slot "contentt" provided. Did you mean "content"?',
			},
		]);
	});

	test("suggests the closest matching slot name for typos", () => {
		const result = validateSlots({
			providedSlots: ["heder"],
			extractedSlots: {
				slots: ["header", "content", "footer"],
				requiredSlots: [],
			},
		});

		expect(result.warnings).toHaveLength(1);
		expect(result.warnings.at(0)?.message).toBe(
			'Unknown slot "heder" provided. Did you mean "header"?',
		);
	});

	test("warns without suggestion when no slot name is similar enough", () => {
		const result = validateSlots({
			providedSlots: ["completely-unrelated"],
			extractedSlots: {
				slots: ["header", "content"],
				requiredSlots: [],
			},
		});

		expect(result.warnings).toEqual([
			{
				type: "unknown-slot",
				slotName: "completely-unrelated",
				message:
					'Unknown slot "completely-unrelated" provided. Available slots: "header", "content"',
			},
		]);
	});

	test("returns both errors and warnings simultaneously", () => {
		const result = validateSlots({
			providedSlots: ["heder"],
			extractedSlots: {
				slots: ["header", "content"],
				requiredSlots: ["header", "content"],
			},
		});

		expect(result.errors).toHaveLength(2);
		expect(result.warnings).toHaveLength(1);
	});

	test("handles empty provided and extracted slots", () => {
		const result = validateSlots({
			providedSlots: [],
			extractedSlots: {
				slots: [],
				requiredSlots: [],
			},
		});

		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
	});

	test("does not warn for optional slots that are not provided", () => {
		const result = validateSlots({
			providedSlots: ["header"],
			extractedSlots: {
				slots: ["header", "sidebar"],
				requiredSlots: ["header"],
			},
		});

		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
	});
});
