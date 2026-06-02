import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		root: import.meta.dirname,
		include: ["scripts/**/*.test.js"],
		watch: false,
		restoreMocks: true,
	},
});
