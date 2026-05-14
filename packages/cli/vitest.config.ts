import { defineConfig } from "vitest/config";

import { nodeConfig } from "../../tools/vitest-base";

export default defineConfig({
	test: nodeConfig,
});
