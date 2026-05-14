import type { ViteUserConfig } from "vitest/config";

export const baseConfig: ViteUserConfig["test"] = {
	passWithNoTests: true,
	watch: false,
	globals: false,
	restoreMocks: true,
	coverage: {
		provider: "v8",
		reporter: ["text", "lcov"],
		exclude: ["**/node_modules/**", "**/dist/**", "**/*.test.ts", "**/*.test.tsx"],
	},
};

export const nodeConfig: ViteUserConfig["test"] = {
	...baseConfig,
	environment: "node",
};

export const browserConfig: ViteUserConfig["test"] = {
	...baseConfig,
	environment: "jsdom",
};
