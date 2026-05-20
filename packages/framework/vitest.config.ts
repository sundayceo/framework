import { defineConfig } from "vitest/config";

import { nodeConfig } from "../../tools/vitest-base";

export default defineConfig({
	test: {
		...nodeConfig,
		coverage: {
			...nodeConfig.coverage,
			include: ["src/**/*.ts", "src/**/*.tsx"],
			thresholds: {
				lines: 100,
				functions: 100,
				branches: 100,
				statements: 100,
			},
		},
	},
});
