import { generateHydrationScript } from "./generate-hydration-script";

type InjectHydrationInput = {
	html: string;
	slotInteractivity: Record<string, boolean>;
	routePath: string;
	loaderData: unknown;
	assetPaths?: Record<string, string>;
};

function buildSlotPattern(slotId: string): RegExp {
	return new RegExp(`<div data-slot="${slotId}">(.*?)</div>`, "s");
}

function wrapWithBoundary(input: { content: string; slotId: string }): string {
	const { content, slotId } = input;
	return `<div data-hydrate="${slotId}">${content}</div>`;
}

function buildDataScript(input: { slotId: string; loaderData: unknown }): string {
	const { slotId, loaderData } = input;
	return `<script type="application/json" data-hydrate-data="${slotId}">${JSON.stringify(loaderData)}</script>`;
}

function buildModuleScript(input: { slotId: string; assetPath: string }): string {
	const { slotId, assetPath } = input;
	const code = generateHydrationScript({ slotId, assetPath });
	return `<script type="module">${code}</script>`;
}

function resolveAssetPath(input: {
	slotId: string;
	routePath: string;
	assetPaths?: Record<string, string>;
}): string {
	const { slotId, routePath, assetPaths } = input;
	const resolved = assetPaths?.[slotId];
	if (resolved !== undefined) {
		return resolved;
	}
	return `virtual:hydrate${routePath}/${slotId}`;
}

export function injectHydration(input: InjectHydrationInput): string {
	const { html, slotInteractivity, routePath, loaderData, assetPaths } = input;

	const interactiveSlotIds = Object.entries(slotInteractivity)
		.filter(([, interactive]) => interactive)
		.map(([id]) => id);

	if (interactiveSlotIds.length === 0) {
		return html;
	}

	let result = html;
	const scriptsToAppend: string[] = [];

	for (const slotId of interactiveSlotIds) {
		const pattern = buildSlotPattern(slotId);
		result = result.replace(pattern, (_match, content: string) => {
			return wrapWithBoundary({ content, slotId });
		});

		const assetPath = resolveAssetPath({ slotId, routePath, assetPaths });
		scriptsToAppend.push(buildDataScript({ slotId, loaderData }));
		scriptsToAppend.push(buildModuleScript({ slotId, assetPath }));
	}

	const scriptsHtml = scriptsToAppend.join("");
	result = result.replace("</body>", `${scriptsHtml}</body>`);

	return result;
}
