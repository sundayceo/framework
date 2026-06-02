import { describe, expect, it, vi } from "vitest";

const run = require("./auto-label-issues.js");

describe("auto-label-issues", () => {
	it("adds needs-triage label to new issue", async () => {
		const github = { rest: { issues: { addLabels: vi.fn() } } };
		const context = {
			repo: { owner: "sundayceo", repo: "framework" },
			issue: { number: 1 },
		};

		await run({ github, context });

		expect(github.rest.issues.addLabels).toHaveBeenCalledWith({
			owner: "sundayceo",
			repo: "framework",
			issue_number: 1,
			labels: ["needs-triage"],
		});
	});
});
