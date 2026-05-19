import type { UserConfig } from "vite";

type ClientBuildInput = {
	entries: string[];
	outDir: string;
};

type ServerBuildInput = {
	entry: string;
	outDir: string;
};

function isVendorModule(id: string): boolean {
	return id.includes("node_modules/react") || id.includes("node_modules/react-dom");
}

/** Creates a Vite build config for the client bundle with vendor code-splitting. */
export function createClientBuildConfig(input: ClientBuildInput): UserConfig {
	return {
		build: {
			rolldownOptions: {
				input: input.entries,
				output: {
					codeSplitting: {
						groups: [
							{
								name: "vendor",
								test: isVendorModule,
							},
						],
					},
				},
			},
			outDir: input.outDir,
			manifest: true,
		},
	};
}

/** Creates a Vite build config for the SSR server bundle. */
export function createServerBuildConfig(input: ServerBuildInput): UserConfig {
	return {
		build: {
			ssr: input.entry,
			outDir: input.outDir,
		},
	};
}
