import { expect, expectTypeOf, test } from "vitest";

import {
	codegen,
	generateServerEntry,
	type ClientEntry,
	type CodegenInput,
	type CodegenOutput,
	type HydrationManifest,
} from "./index";

test("exports codegen orchestrator", () => {
	expect(codegen).toBeTypeOf("function");
});

test("exports generateServerEntry", () => {
	expect(generateServerEntry).toBeTypeOf("function");
});

test("exports type-safe CodegenOutput with clientEntries", () => {
	const result = codegen({ routePaths: [], templatePaths: [] });
	expectTypeOf(result).toExtend<CodegenOutput>();
	expectTypeOf(result.clientEntries).toExtend<ClientEntry[]>();
});

test("HydrationManifest type is correct", () => {
	const manifest: HydrationManifest = { "/": { main: true, header: false } };
	expectTypeOf(manifest).toExtend<Record<string, Record<string, boolean>>>();
});

test("CodegenInput accepts optional fields", () => {
	const input: CodegenInput = {
		routePaths: ["index.tsx"],
		templatePaths: ["default.tsx"],
	};
	expectTypeOf(input).toExtend<CodegenInput>();
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
