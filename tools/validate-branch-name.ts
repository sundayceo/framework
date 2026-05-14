const ISSUE_BRANCH_PATTERN = /^\d+-[a-z0-9-]+$/;
const ALLOWED_PREFIXES = ["release-please--"];
const ALLOWED_BRANCHES = new Set(["main"]);

export function validateBranchName(name: string): boolean {
	if (ALLOWED_BRANCHES.has(name)) return true;
	if (ALLOWED_PREFIXES.some((prefix) => name.startsWith(prefix))) return true;
	return ISSUE_BRANCH_PATTERN.test(name);
}

const branch = process.argv[2];
if (branch) {
	if (!validateBranchName(branch)) {
		console.error(
			`Branch name "${branch}" does not match the required format: <issue-number>-<description>`,
		);
		console.error("Example: 31-release-infrastructure");
		process.exit(1);
	}
}
