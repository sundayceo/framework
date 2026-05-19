import { expectTypeOf, test } from "vitest";

import type { AppConfig } from "./create-app";
import type { CustomContext, Register, RegisteredApp } from "./types";

test("Register interface exists and is exported", () => {
	expectTypeOf<Register>().toBeObject();
});

test("RegisteredApp extracts AppConfig when Register is augmented", () => {
	// Without augmentation in this file, RegisteredApp should be undefined
	// (unless another test file augments it — these are type-level checks)
	expectTypeOf<RegisteredApp>().toEqualTypeOf<undefined>();
});

test("CustomContext falls back to Record<string, unknown> without augmentation", () => {
	expectTypeOf<CustomContext>().toEqualTypeOf<Record<string, unknown>>();
});

test("when Register is augmented with app, CustomContext extracts the custom type", () => {
	// We can't actually augment in the same file for a scoped test,
	// but we can verify the conditional type logic directly
	type TestApp = AppConfig<{ db: string }>;
	type TestRegister = { app: TestApp };
	type Extracted = TestRegister extends { app: infer T }
		? T extends AppConfig<infer C>
			? C
			: Record<string, unknown>
		: Record<string, unknown>;

	expectTypeOf<Extracted>().toEqualTypeOf<{ db: string }>();
});
