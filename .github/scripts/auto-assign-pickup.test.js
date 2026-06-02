import { describe, expect, it, vi } from "vitest";

const run = require("./auto-assign-pickup.js");

describe("auto-assign-pickup", () => {
	it("assigns actor when in-progress label is added", async () => {
		const github = { rest: { issues: { addAssignees: vi.fn() } } };
		const context = {
			payload: { label: { name: "in-progress" } },
			repo: { owner: "sundayceo", repo: "framework" },
			issue: { number: 5 },
			actor: "agent-bot",
		};

		await run({ github, context });

		expect(github.rest.issues.addAssignees).toHaveBeenCalledWith({
			owner: "sundayceo",
			repo: "framework",
			issue_number: 5,
			assignees: ["agent-bot"],
		});
	});

	it("does nothing for other labels", async () => {
		const github = { rest: { issues: { addAssignees: vi.fn() } } };
		const context = {
			payload: { label: { name: "bug" } },
			repo: { owner: "sundayceo", repo: "framework" },
			issue: { number: 5 },
			actor: "agent-bot",
		};

		await run({ github, context });

		expect(github.rest.issues.addAssignees).not.toHaveBeenCalled();
	});
});
