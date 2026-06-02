module.exports = async ({ github, context }) => {
	await github.rest.issues.addLabels({
		owner: context.repo.owner,
		repo: context.repo.repo,
		issue_number: context.issue.number,
		labels: ["needs-triage"],
	});
};
