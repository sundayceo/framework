import React, { type ReactNode } from "react";
import { renderToString } from "react-dom/server";

import { extractSlots } from "./extract-slots";
import { SlotProvider } from "./slot";
import type { Context, MetaInfo, SlotMap, TemplateComponent } from "./types";
import { validateSlots } from "./validate-slots";

type RenderablePageModule = {
	loader?: (ctx: Context) => unknown;
	defineSlots: (args: { loaderData: unknown }) => SlotMap;
	meta?: MetaInfo | ((args: { loaderData: unknown }) => MetaInfo);
};

type RenderPageInput = {
	pageModule: RenderablePageModule;
	template: TemplateComponent;
	request: Request;
	params: Record<string, string>;
	appContext: Record<string, unknown>;
	cssHref?: string;
	hasViewTransition?: boolean;
	slotInteractivity?: Record<string, boolean>;
	assetPaths?: Record<string, string>;
	routePath?: string;
};

function resolveMeta(meta: RenderablePageModule["meta"], loaderData: unknown): MetaInfo {
	if (meta === undefined) {
		return {};
	}
	if (typeof meta === "function") {
		return meta({ loaderData });
	}
	return meta;
}

function renderMeta(meta: MetaInfo, hasViewTransition?: boolean): ReactNode {
	return (
		<>
			{meta.title !== undefined && <title>{meta.title}</title>}
			{meta.description !== undefined && <meta name="description" content={meta.description} />}
			{hasViewTransition === true && <meta name="view-transition" content="same-origin" />}
		</>
	);
}

function buildHeadContent(input: {
	meta: MetaInfo;
	cssHref?: string;
	hasViewTransition?: boolean;
}): ReactNode {
	const { meta, cssHref, hasViewTransition } = input;
	return (
		<>
			{renderMeta(meta, hasViewTransition)}
			{cssHref !== undefined && <link rel="stylesheet" href={cssHref} />}
		</>
	);
}

function runLoader(input: {
	pageModule: RenderablePageModule;
	request: Request;
	params: Record<string, string>;
	appContext: Record<string, unknown>;
}): unknown {
	if (!input.pageModule.loader) {
		return undefined;
	}

	const ctx: Context = {
		request: input.request,
		params: input.params,
		...input.appContext,
	};

	return input.pageModule.loader(ctx);
}

function escapeScriptContent(json: string): string {
	return json.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
}

/** Server-renders a page module into a full HTML response with slots, meta, and hydration. */
export async function renderPage(input: RenderPageInput): Promise<Response> {
	const {
		pageModule,
		template: Template,
		request,
		params,
		appContext,
		cssHref,
		hasViewTransition,
		slotInteractivity,
		assetPaths,
		routePath = "",
	} = input;

	const loaderData = await runLoader({ pageModule, request, params, appContext });
	const slotMap = pageModule.defineSlots({ loaderData });

	const extractedSlots = extractSlots(Template);
	const providedSlots = Object.keys(slotMap);
	const validation = validateSlots({ providedSlots, extractedSlots });
	for (const warning of validation.warnings) {
		console.warn(`[sundayceo] ${routePath}: ${warning.message}`);
	}
	if (validation.errors.length > 0) {
		const details = validation.errors.map((e) => e.message).join("; ");
		throw new Error(`Slot validation failed for "${routePath}": ${details}`);
	}

	const meta = resolveMeta(pageModule.meta, loaderData);
	const headContent = buildHeadContent({ meta, cssHref, hasViewTransition });

	const hydration =
		slotInteractivity !== undefined
			? {
					interactivity: slotInteractivity,
					serializedData: escapeScriptContent(JSON.stringify(loaderData ?? {})),
					assetPaths,
					routePath,
				}
			: undefined;

	const html = renderToString(
		<SlotProvider slots={slotMap} hydration={hydration}>
			<Template head={headContent} />
		</SlotProvider>,
	);

	return new Response(`<!DOCTYPE html>${html}`, {
		headers: { "content-type": "text/html;charset=utf-8" },
	});
}
