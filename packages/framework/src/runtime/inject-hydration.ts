import { generateHydrationScript } from "./generate-hydration-script";

type InjectHydrationInput = {
	html: string;
	slotInteractivity: Record<string, boolean>;
	routePath: string;
	loaderData: unknown;
	assetPaths?: Record<string, string>;
};

const DIV_OPEN = "<div";
const DIV_CLOSE = "</div>";

function findSlotContent(html: string, slotId: string): { start: number; end: number } | null {
	const openTag = `<div data-slot="${slotId}">`;
	const openIdx = html.indexOf(openTag);
	if (openIdx === -1) {
		return null;
	}

	const contentStart = openIdx + openTag.length;
	let depth = 1;
	let i = contentStart;

	while (i < html.length && depth > 0) {
		const charAfterDiv = html.charAt(i + DIV_OPEN.length);
		if (html.startsWith(DIV_OPEN, i) && (charAfterDiv === ">" || charAfterDiv === " ")) {
			depth++;
			i += DIV_OPEN.length;
		} else if (html.startsWith(DIV_CLOSE, i)) {
			depth--;
			if (depth === 0) {
				return { start: openIdx, end: i + DIV_CLOSE.length };
			}
			i += DIV_CLOSE.length;
		} else {
			i++;
		}
	}

	return null;
}

function wrapWithBoundary(input: { content: string; slotId: string }): string {
	const { content, slotId } = input;
	return `<div data-hydrate="${slotId}">${content}</div>`;
}

function escapeScriptContent(json: string): string {
	return json.replace(/</g, "\\u003c");
}

function buildDataScript(input: { slotId: string; loaderData: unknown }): string {
	const { slotId, loaderData } = input;
	const raw = JSON.stringify(loaderData ?? {});
	return `<script type="application/json" data-hydrate-data="${slotId}">${escapeScriptContent(raw)}</script>`;
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

/** Injects hydration boundaries, data scripts, and module scripts into server-rendered HTML. */
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
		const slot = findSlotContent(result, slotId);
		if (slot !== null) {
			const outerHtml = result.slice(slot.start, slot.end);
			const openTag = `<div data-slot="${slotId}">`;
			const innerContent = outerHtml.slice(openTag.length, outerHtml.length - DIV_CLOSE.length);
			result =
				result.slice(0, slot.start) +
				wrapWithBoundary({ content: innerContent, slotId }) +
				result.slice(slot.end);
		}

		const assetPath = resolveAssetPath({ slotId, routePath, assetPaths });
		scriptsToAppend.push(buildDataScript({ slotId, loaderData }));
		scriptsToAppend.push(buildModuleScript({ slotId, assetPath }));
	}

	const scriptsHtml = scriptsToAppend.join("");
	result = result.replace("</body>", `${scriptsHtml}</body>`);

	return result;
}
