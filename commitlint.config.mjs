export default {
	extends: ["@commitlint/config-conventional"],
	rules: {
		"scope-enum": [
			2,
			"always",
			["framework", "cli", "playground", "repo", "deps", "ci"],
		],
	},
};
