import React, { type ReactNode } from "react";
import { renderToString } from "react-dom/server";

import type { Context, SlotMap, TemplateComponent } from "./core/index";
import { extractSlots } from "./extract-slots";
import { injectHydration } from "./inject-hydration";
import { isInteractive } from "./interactivity-inference";
import { SlotProvider } from "./slot";
import { validateSlots } from "./validate-slots";

type MetaInfo = { title?: string; description?: string };

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
	slotSources?: Record<string, string>;
	importGraph?: Record<string, string>;
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
			<meta charSet="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
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

function buildSlotInteractivity(input: {
	slotSources: Record<string, string>;
	importGraph: Record<string, string>;
}): Record<string, boolean> {
	const result: Record<string, boolean> = {};
	for (const [slotName, source] of Object.entries(input.slotSources)) {
		result[slotName] = isInteractive(source, input.importGraph);
	}
	return result;
}

export async function renderPage(input: RenderPageInput): Promise<Response> {
	const {
		pageModule,
		template: Template,
		request,
		params,
		appContext,
		cssHref,
		hasViewTransition,
		slotSources,
		importGraph = {},
		routePath = "",
	} = input;

	const loaderData = await runLoader({ pageModule, request, params, appContext });
	const slotMap = pageModule.defineSlots({ loaderData });

	const extractedSlots = extractSlots(Template);
	const providedSlots = Object.keys(slotMap);
	const validation = validateSlots({ providedSlots, extractedSlots });

	for (const warning of validation.warnings) {
		// eslint-disable-next-line no-console
		console.warn(`[sundayceo] ${warning.message}`);
	}

	if (validation.errors.length > 0) {
		throw new Error(validation.errors.map((e) => e.message).join("; "));
	}

	const meta = resolveMeta(pageModule.meta, loaderData);
	const headContent = buildHeadContent({ meta, cssHref, hasViewTransition });

	let html = renderToString(
		<SlotProvider slots={slotMap}>
			<Template head={headContent} />
		</SlotProvider>,
	);

	if (slotSources !== undefined) {
		const slotInteractivity = buildSlotInteractivity({ slotSources, importGraph });
		html = injectHydration({
			html,
			slotInteractivity,
			routePath,
			loaderData,
		});
	}

	return new Response(`<!DOCTYPE html>${html}`, {
		headers: { "content-type": "text/html;charset=utf-8" },
	});
}
