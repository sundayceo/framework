import { describe, expect, test } from "vitest";

import { generateTemplateRegistry } from "./codegen-templates";

describe("generateTemplateRegistry", () => {
	test("generates correct d.ts for a single template", () => {
		const result = generateTemplateRegistry(["marketing.tsx"]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"\tinterface TemplateRegistry {",
				'\t\tmarketing: typeof import("./templates/marketing").default;',
				"\t}",
				"}",
				"",
			].join("\n"),
		);
	});

	test("sorts multiple templates alphabetically", () => {
		const result = generateTemplateRegistry(["minimal.tsx", "marketing.tsx", "blog.tsx"]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"\tinterface TemplateRegistry {",
				'\t\tblog: typeof import("./templates/blog").default;',
				'\t\tmarketing: typeof import("./templates/marketing").default;',
				'\t\tminimal: typeof import("./templates/minimal").default;',
				"\t}",
				"}",
				"",
			].join("\n"),
		);
	});

	test("returns empty registry for empty input", () => {
		const result = generateTemplateRegistry([]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"\tinterface TemplateRegistry {",
				"\t}",
				"}",
				"",
			].join("\n"),
		);
	});

	test("filters out non-.tsx files", () => {
		const result = generateTemplateRegistry([
			"marketing.tsx",
			"utils.ts",
			"styles.css",
			"readme.md",
			"minimal.tsx",
		]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"\tinterface TemplateRegistry {",
				'\t\tmarketing: typeof import("./templates/marketing").default;',
				'\t\tminimal: typeof import("./templates/minimal").default;',
				"\t}",
				"}",
				"",
			].join("\n"),
		);
	});
});
