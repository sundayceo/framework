module.exports = async ({ github, context }) => {
	if (context.payload.label.name !== "in-progress") return;

	await github.rest.issues.addAssignees({
		owner: context.repo.owner,
		repo: context.repo.repo,
		issue_number: context.issue.number,
		assignees: [context.actor],
	});
};
