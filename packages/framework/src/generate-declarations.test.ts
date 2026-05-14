import { describe, expect, test } from "vitest";

import { generateDeclarations } from "./generate-declarations";

describe("generateDeclarations", () => {
	test("generates empty registries for empty inputs", () => {
		const result = generateDeclarations({ templatePaths: [], routePaths: [] });

		expect(result).toContain("interface TemplateRegistry {");
		expect(result).toContain("interface RouteMap {");
		expect(result).not.toMatch(/import\(/);
	});

	test("generates template registry block only when templates provided", () => {
		const result = generateDeclarations({
			templatePaths: ["marketing.tsx"],
			routePaths: [],
		});

		expect(result).toContain('marketing: typeof import("./templates/marketing").default;');
		expect(result).toContain("interface RouteMap {");
	});

	test("generates route map block only when routes provided", () => {
		const result = generateDeclarations({
			templatePaths: [],
			routePaths: ["about.tsx"],
		});

		expect(result).toContain('"/about": {};');
		expect(result).toContain("interface TemplateRegistry {");
	});

	test("combines both template and route blocks", () => {
		const result = generateDeclarations({
			templatePaths: ["marketing.tsx", "blog.tsx"],
			routePaths: ["index.tsx", "about.tsx", "[slug].tsx"],
		});

		expect(result).toContain('blog: typeof import("./templates/blog").default;');
		expect(result).toContain('marketing: typeof import("./templates/marketing").default;');
		expect(result).toContain('"/": {};');
		expect(result).toContain('"/about": {};');
		expect(result).toContain('"/[slug]": { slug: string };');
	});

	test("output contains two declare module blocks", () => {
		const result = generateDeclarations({
			templatePaths: ["marketing.tsx"],
			routePaths: ["index.tsx"],
		});

		const moduleCount = (result.match(/declare module "@sundayceo\/framework"/g) ?? []).length;
		expect(moduleCount).toBe(2);
	});
});
