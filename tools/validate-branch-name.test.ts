import { expect, test } from "vitest";

import { validateBranchName } from "./validate-branch-name.ts";

test("accepts valid branch names like 31-release-infrastructure", () => {
	expect(validateBranchName("31-release-infrastructure")).toBe(true);
});

test("allows main branch", () => {
	expect(validateBranchName("main")).toBe(true);
});

test("rejects branches without issue numbers", () => {
	expect(validateBranchName("feature/foo")).toBe(false);
	expect(validateBranchName("fix-something")).toBe(false);
	expect(validateBranchName("my-branch")).toBe(false);
});

test("rejects uppercase and invalid characters", () => {
	expect(validateBranchName("31-Release-Infrastructure")).toBe(false);
	expect(validateBranchName("31-release_infrastructure")).toBe(false);
	expect(validateBranchName("31-release infrastructure")).toBe(false);
});

test("allows release-please branches", () => {
	expect(validateBranchName("release-please--branches--main")).toBe(true);
});
