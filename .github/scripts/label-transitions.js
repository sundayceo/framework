const transitions = {
	"ready-for-agent": ["needs-triage"],
	"ready-for-human": ["needs-triage"],
	"needs-info": ["needs-triage"],
	wontfix: ["needs-triage"],
	"in-progress": ["ready-for-agent", "ready-for-human"],
	"ready-for-review": ["ready-for-agent", "ready-for-human", "needs-info", "in-progress"],
};

module.exports = async ({ github, context }) => {
	const added = context.payload.label.name;
	const toRemove = transitions[added];
	if (!toRemove) return;

	for (const label of toRemove) {
		try {
			await github.rest.issues.removeLabel({
				owner: context.repo.owner,
				repo: context.repo.repo,
				issue_number: context.issue.number,
				name: label,
			});
		} catch (e) {
			if (e.status !== 404) throw e;
		}
	}
};

module.exports.transitions = transitions;
