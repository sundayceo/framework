import * as p from "@clack/prompts";

import { scaffold } from "./scaffold.js";

const VALID_NAME_PATTERN = /^[a-z0-9@][a-z0-9._@/-]*$/;

async function main(): Promise<void> {
	p.intro("create-sundayceo");

	const name = await p.text({
		message: "What is the name of your project?",
		placeholder: "my-app",
		validate: (value) => {
			if (value.length === 0) {
				return "Project name cannot be empty.";
			}
			if (!VALID_NAME_PATTERN.test(value)) {
				return "Project name must be lowercase and contain only letters, numbers, hyphens, dots, underscores, slashes, or @.";
			}
			return undefined;
		},
	});

	if (p.isCancel(name)) {
		p.cancel("Cancelled.");
		process.exitCode = 1;
		return;
	}

	const destDir = scaffold({ name, path: name });

	p.outro(`Created ${name} at ${destDir}

Next steps:
  cd ${name}
  npm install
  npm run dev`);
}

void main();
