import { parse } from "@babel/parser";
import { describe, expect, test } from "vitest";

import { generateTemplateRegistry } from "./codegen-templates";

function parseDeclaration(source: string): void {
	parse(source, { sourceType: "module", plugins: ["typescript"] });
}

describe("generateTemplateRegistry", () => {
	test("generates declaration for template files", () => {
		const result = generateTemplateRegistry(["default.tsx"]);

		expect(result).toContain("interface TemplateRegistry");
		expect(result).toContain('"default": typeof import("./templates/default").default;');
	});

	test("handles multiple templates", () => {
		const result = generateTemplateRegistry(["default.tsx", "minimal.tsx"]);

		expect(result).toContain('"default":');
		expect(result).toContain('"minimal":');
	});

	test("filters out non-tsx files", () => {
		const result = generateTemplateRegistry(["default.tsx", "utils.ts"]);

		expect(result).not.toContain("utils");
		expect(result).toContain('"default":');
	});

	test("quotes kebab-case template names", () => {
		const result = generateTemplateRegistry(["blog-post.tsx"]);

		expect(result).toContain('"blog-post": typeof import("./templates/blog-post").default;');
	});

	test("produces parseable output for names that are not bare identifiers", () => {
		const result = generateTemplateRegistry(["blog-post.tsx", "2col.tsx", "my template.tsx"]);

		expect(() => {
			parseDeclaration(result);
		}).not.toThrow();
	});

	test("produces parseable output for identifier-safe names", () => {
		const result = generateTemplateRegistry(["default.tsx", "minimal.tsx"]);

		expect(() => {
			parseDeclaration(result);
		}).not.toThrow();
	});

	test("sorts templates alphabetically", () => {
		const result = generateTemplateRegistry(["wide.tsx", "default.tsx", "narrow.tsx"]);
		const dIdx = result.indexOf('"default":');
		const nIdx = result.indexOf('"narrow":');
		const wIdx = result.indexOf('"wide":');

		expect(dIdx).toBeLessThan(nIdx);
		expect(nIdx).toBeLessThan(wIdx);
	});
});
