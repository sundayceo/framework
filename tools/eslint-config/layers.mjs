const LAYERS = {
	foundation: 1,
	tooling: 2,
};

const PACKAGE_LAYER = {
	framework: LAYERS.foundation,
	"typescript-config": LAYERS.foundation,
	cli: LAYERS.tooling,
};

const packagesAtLayer = (layer) =>
	Object.entries(PACKAGE_LAYER)
		.filter(([, l]) => l === layer)
		.map(([pkg]) => pkg);

const higherLayerPackages = (layer) =>
	Object.entries(PACKAGE_LAYER)
		.filter(([, l]) => l > layer)
		.map(([pkg]) => `@sundayceo/${pkg}`);

export const layerEnforcementConfigs = () => {
	const configs = [];

	for (const [layerName, layerNum] of Object.entries(LAYERS)) {
		const forbidden = higherLayerPackages(layerNum);
		if (forbidden.length === 0) {
			continue;
		}

		const pkgs = packagesAtLayer(layerNum);
		const filePatterns = pkgs.map((pkg) => `packages/${pkg}/src/**/*.{ts,tsx}`);

		configs.push({
			files: filePatterns,
			rules: {
				"no-restricted-imports": [
					"error",
					{
						patterns: [
							{
								group: [...forbidden, ...forbidden.map((p) => `${p}/*`)],
								message: `Layer violation: ${layerName} (layer ${layerNum}) cannot import from a higher layer.`,
							},
							{
								group: ["**/internal/*", "**/internal"],
								message: "Do not import from internal/ — it is not part of the public API.",
							},
						],
					},
				],
			},
		});
	}

	return configs;
};
