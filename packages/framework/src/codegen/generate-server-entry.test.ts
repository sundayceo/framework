import { describe, expect, test } from "vitest";

import { generateServerEntry } from "./generate-server-entry";

describe("generateServerEntry", () => {
	test("generates valid module code", () => {
		const result = generateServerEntry({
			appModule: "./app",
			routesModule: "./routes.gen",
		});

		expect(result).toContain('import { createHandler } from "@sundayceo/framework"');
		expect(result).toContain('import { app } from "./app"');
		expect(result).toContain(
			'import { routes, templates, errorPages, hydrationManifest } from "./routes.gen"',
		);
		expect(result).toContain("export default createHandler(");
	});

	test("uses custom module paths", () => {
		const result = generateServerEntry({
			appModule: "../src/app",
			routesModule: "../src/routes.gen",
		});

		expect(result).toContain('from "../src/app"');
		expect(result).toContain('from "../src/routes.gen"');
	});

	test("wires all config fields into createHandler", () => {
		const result = generateServerEntry({
			appModule: "./app",
			routesModule: "./routes.gen",
		});

		expect(result).toContain("app,");
		expect(result).toContain("routes,");
		expect(result).toContain("templates,");
		expect(result).toContain("errorPages,");
		expect(result).toContain("hydrationManifest");
	});
});
