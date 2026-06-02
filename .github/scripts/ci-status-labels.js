const CLOSING_KEYWORD =
	/(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)/gi;

function parseLinkedIssues(body) {
	const issues = new Set();
	let match;
	while ((match = CLOSING_KEYWORD.exec(body)) !== null) {
		issues.add(Number(match[1]));
	}
	return issues;
}

module.exports = async ({ github, context }) => {
	const conclusion = context.payload.workflow_run.conclusion;
	const prs = context.payload.workflow_run.pull_requests;

	if (!prs || prs.length === 0) return;

	const prNumber = prs[0].number;
	const { data: pr } = await github.rest.pulls.get({
		owner: context.repo.owner,
		repo: context.repo.repo,
		pull_number: prNumber,
	});

	if (conclusion === "success") {
		const issueNumbers = parseLinkedIssues(pr.body || "");
		if (issueNumbers.size === 0) return;

		for (const issueNumber of issueNumbers) {
			await github.rest.issues.addLabels({
				owner: context.repo.owner,
				repo: context.repo.repo,
				issue_number: issueNumber,
				labels: ["ready-for-review"],
			});
		}
	} else if (conclusion === "failure") {
		const runUrl = context.payload.workflow_run.html_url;
		await github.rest.issues.createComment({
			owner: context.repo.owner,
			repo: context.repo.repo,
			issue_number: prNumber,
			body: `CI failed for this pull request.\n\n[View the failed run](${runUrl})`,
		});
	}
};

module.exports.parseLinkedIssues = parseLinkedIssues;
