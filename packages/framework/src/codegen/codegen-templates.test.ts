import { describe, expect, test } from "vitest";

import { generateTemplateRegistry } from "./codegen-templates";

describe("generateTemplateRegistry", () => {
	test("generates declaration for template files", () => {
		const result = generateTemplateRegistry(["default.tsx"]);

		expect(result).toContain("interface TemplateRegistry");
		expect(result).toContain('default: typeof import("./templates/default").default;');
	});

	test("handles multiple templates", () => {
		const result = generateTemplateRegistry(["default.tsx", "minimal.tsx"]);

		expect(result).toContain("default:");
		expect(result).toContain("minimal:");
	});

	test("filters out non-tsx files", () => {
		const result = generateTemplateRegistry(["default.tsx", "utils.ts"]);

		expect(result).not.toContain("utils");
		expect(result).toContain("default:");
	});

	test("sorts templates alphabetically", () => {
		const result = generateTemplateRegistry(["wide.tsx", "default.tsx", "narrow.tsx"]);
		const dIdx = result.indexOf("default:");
		const nIdx = result.indexOf("narrow:");
		const wIdx = result.indexOf("wide:");

		expect(dIdx).toBeLessThan(nIdx);
		expect(nIdx).toBeLessThan(wIdx);
	});

	test("wraps in module declaration", () => {
		const result = generateTemplateRegistry(["default.tsx"]);

		expect(result).toContain('declare module "@sundayceo/framework"');
	});
});
