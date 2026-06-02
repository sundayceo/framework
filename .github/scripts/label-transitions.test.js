import { describe, expect, it, vi } from "vitest";

const run = require("./label-transitions.js");

function makeContext(labelName) {
	return {
		payload: { label: { name: labelName } },
		repo: { owner: "sundayceo", repo: "framework" },
		issue: { number: 42 },
	};
}

function makeGithub() {
	return { rest: { issues: { removeLabel: vi.fn() } } };
}

describe("label-transitions", () => {
	it("removes needs-triage when ready-for-agent is added", async () => {
		const github = makeGithub();
		await run({ github, context: makeContext("ready-for-agent") });

		expect(github.rest.issues.removeLabel).toHaveBeenCalledWith(
			expect.objectContaining({ name: "needs-triage" }),
		);
	});

	it("removes needs-triage when ready-for-human is added", async () => {
		const github = makeGithub();
		await run({ github, context: makeContext("ready-for-human") });

		expect(github.rest.issues.removeLabel).toHaveBeenCalledWith(
			expect.objectContaining({ name: "needs-triage" }),
		);
	});

	it("removes needs-triage when needs-info is added", async () => {
		const github = makeGithub();
		await run({ github, context: makeContext("needs-info") });

		expect(github.rest.issues.removeLabel).toHaveBeenCalledWith(
			expect.objectContaining({ name: "needs-triage" }),
		);
	});

	it("removes needs-triage when wontfix is added", async () => {
		const github = makeGithub();
		await run({ github, context: makeContext("wontfix") });

		expect(github.rest.issues.removeLabel).toHaveBeenCalledWith(
			expect.objectContaining({ name: "needs-triage" }),
		);
	});

	it("removes ready-for-agent and ready-for-human when in-progress is added", async () => {
		const github = makeGithub();
		await run({ github, context: makeContext("in-progress") });

		expect(github.rest.issues.removeLabel).toHaveBeenCalledTimes(2);
		expect(github.rest.issues.removeLabel).toHaveBeenCalledWith(
			expect.objectContaining({ name: "ready-for-agent" }),
		);
		expect(github.rest.issues.removeLabel).toHaveBeenCalledWith(
			expect.objectContaining({ name: "ready-for-human" }),
		);
	});

	it("removes ready-for-agent, ready-for-human, needs-info, and in-progress when ready-for-review is added", async () => {
		const github = makeGithub();
		await run({ github, context: makeContext("ready-for-review") });

		expect(github.rest.issues.removeLabel).toHaveBeenCalledTimes(4);
		expect(github.rest.issues.removeLabel).toHaveBeenCalledWith(
			expect.objectContaining({ name: "ready-for-agent" }),
		);
		expect(github.rest.issues.removeLabel).toHaveBeenCalledWith(
			expect.objectContaining({ name: "ready-for-human" }),
		);
		expect(github.rest.issues.removeLabel).toHaveBeenCalledWith(
			expect.objectContaining({ name: "needs-info" }),
		);
		expect(github.rest.issues.removeLabel).toHaveBeenCalledWith(
			expect.objectContaining({ name: "in-progress" }),
		);
	});

	it("does nothing for unrelated labels", async () => {
		const github = makeGithub();
		await run({ github, context: makeContext("bug") });

		expect(github.rest.issues.removeLabel).not.toHaveBeenCalled();
	});

	it("ignores 404 when label is not present", async () => {
		const github = makeGithub();
		const error = new Error("Not Found");
		error.status = 404;
		github.rest.issues.removeLabel.mockRejectedValue(error);

		await expect(run({ github, context: makeContext("in-progress") })).resolves.not.toThrow();
	});

	it("rethrows non-404 errors", async () => {
		const github = makeGithub();
		const error = new Error("Server Error");
		error.status = 500;
		github.rest.issues.removeLabel.mockRejectedValue(error);

		await expect(run({ github, context: makeContext("in-progress") })).rejects.toThrow(
			"Server Error",
		);
	});
});
