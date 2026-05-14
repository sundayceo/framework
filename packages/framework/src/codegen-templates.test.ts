import { describe, expect, test } from "vitest";

import { generateTemplateRegistry } from "./codegen-templates";

describe("generateTemplateRegistry", () => {
	test("generates correct d.ts for a single template", () => {
		const result = generateTemplateRegistry(["marketing.tsx"]);

		expect(result).toBe(
			[
				'declare module "@sundayceo/framework" {',
				"  interface TemplateRegistry {",
				'    marketing: typeof import("./templates/marketing").default;',
				"  }",
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
				"  interface TemplateRegistry {",
				'    blog: typeof import("./templates/blog").default;',
				'    marketing: typeof import("./templates/marketing").default;',
				'    minimal: typeof import("./templates/minimal").default;',
				"  }",
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
				"  interface TemplateRegistry {",
				"  }",
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
				"  interface TemplateRegistry {",
				'    marketing: typeof import("./templates/marketing").default;',
				'    minimal: typeof import("./templates/minimal").default;',
				"  }",
				"}",
				"",
			].join("\n"),
		);
	});
});
