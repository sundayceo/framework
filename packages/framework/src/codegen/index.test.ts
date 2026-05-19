import { expect, test } from "vitest";

import { codegen } from "./index";

test("exports codegen orchestrator", () => {
	expect(codegen).toBeTypeOf("function");
});

test("does not export internal codegen functions", async () => {
	const barrel = await import("./index");
	expect("extractSlotModules" in barrel).toBe(false);
	expect("isInteractive" in barrel).toBe(false);
	expect("buildClientEntries" in barrel).toBe(false);
	expect("generateRouteManifest" in barrel).toBe(false);
	expect("generateRouteMap" in barrel).toBe(false);
	expect("generateTemplateRegistry" in barrel).toBe(false);
	expect("transformRouteModule" in barrel).toBe(false);
	expect("scanRoutes" in barrel).toBe(false);
});
