import { describe, expect, it, vi } from "vitest";

const run = require("./ci-status-labels.js");
const { parseLinkedIssues } = require("./ci-status-labels.js");

describe("parseLinkedIssues", () => {
	it("extracts issue numbers from closing keywords", () => {
		expect(parseLinkedIssues("Closes #42")).toEqual(new Set([42]));
		expect(parseLinkedIssues("fixes #10")).toEqual(new Set([10]));
		expect(parseLinkedIssues("Resolves #7")).toEqual(new Set([7]));
	});

	it("extracts multiple issue numbers", () => {
		expect(parseLinkedIssues("Closes #1\nFixes #2")).toEqual(new Set([1, 2]));
	});

	it("deduplicates issue numbers", () => {
		expect(parseLinkedIssues("Closes #5\nFixes #5")).toEqual(new Set([5]));
	});

	it("returns empty set when no keywords match", () => {
		expect(parseLinkedIssues("No issues here")).toEqual(new Set());
		expect(parseLinkedIssues("")).toEqual(new Set());
	});
});

function makeGithub(prBody) {
	return {
		rest: {
			pulls: {
				get: vi.fn().mockResolvedValue({ data: { body: prBody } }),
			},
			issues: {
				addLabels: vi.fn(),
				createComment: vi.fn(),
			},
		},
	};
}

describe("ci-status-labels", () => {
	it("does nothing when no PRs are associated", async () => {
		const github = makeGithub("");
		const context = {
			payload: {
				workflow_run: {
					conclusion: "success",
					pull_requests: [],
				},
			},
			repo: { owner: "sundayceo", repo: "framework" },
		};

		await run({ github, context });

		expect(github.rest.pulls.get).not.toHaveBeenCalled();
	});

	it("adds ready-for-review to linked issues on success", async () => {
		const github = makeGithub("Closes #10\nFixes #20");
		const context = {
			payload: {
				workflow_run: {
					conclusion: "success",
					pull_requests: [{ number: 5 }],
				},
			},
			repo: { owner: "sundayceo", repo: "framework" },
		};

		await run({ github, context });

		expect(github.rest.issues.addLabels).toHaveBeenCalledTimes(2);
		expect(github.rest.issues.addLabels).toHaveBeenCalledWith({
			owner: "sundayceo",
			repo: "framework",
			issue_number: 10,
			labels: ["ready-for-review"],
		});
		expect(github.rest.issues.addLabels).toHaveBeenCalledWith({
			owner: "sundayceo",
			repo: "framework",
			issue_number: 20,
			labels: ["ready-for-review"],
		});
	});

	it("does nothing on success when PR has no linked issues", async () => {
		const github = makeGithub("Just a regular PR");
		const context = {
			payload: {
				workflow_run: {
					conclusion: "success",
					pull_requests: [{ number: 5 }],
				},
			},
			repo: { owner: "sundayceo", repo: "framework" },
		};

		await run({ github, context });

		expect(github.rest.issues.addLabels).not.toHaveBeenCalled();
	});

	it("posts a comment on failure", async () => {
		const github = makeGithub("");
		const context = {
			payload: {
				workflow_run: {
					conclusion: "failure",
					pull_requests: [{ number: 7 }],
					html_url: "https://github.com/runs/123",
				},
			},
			repo: { owner: "sundayceo", repo: "framework" },
		};

		await run({ github, context });

		expect(github.rest.issues.createComment).toHaveBeenCalledWith({
			owner: "sundayceo",
			repo: "framework",
			issue_number: 7,
			body: expect.stringContaining("https://github.com/runs/123"),
		});
	});

	it("does nothing for other conclusions", async () => {
		const github = makeGithub("Closes #1");
		const context = {
			payload: {
				workflow_run: {
					conclusion: "cancelled",
					pull_requests: [{ number: 5 }],
				},
			},
			repo: { owner: "sundayceo", repo: "framework" },
		};

		await run({ github, context });

		expect(github.rest.issues.addLabels).not.toHaveBeenCalled();
		expect(github.rest.issues.createComment).not.toHaveBeenCalled();
	});
});
