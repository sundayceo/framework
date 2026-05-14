import { describe, expect, it } from "vitest";

import { VERSION } from "./index";

describe("@sundayceo/framework", () => {
	it("exports a version string", () => {
		expect(VERSION).toBe("0.0.0");
	});
});
