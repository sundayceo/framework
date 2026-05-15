import React, { type ReactNode } from "react";
import { renderToString } from "react-dom/server";

import type { Context, SlotMap, TemplateComponent } from "./core/index";
import { SlotProvider } from "./slot";

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

async function runLoader(
	pageModule: RenderablePageModule,
	request: Request,
	params: Record<string, string>,
	appContext: Record<string, unknown>,
): Promise<unknown> {
	if (!pageModule.loader) {
		return undefined;
	}

	const ctx: Context = {
		request,
		params,
		...appContext,
	};

	return pageModule.loader(ctx);
}

export async function renderPage(input: RenderPageInput): Promise<Response> {
	const { pageModule, template: Template, request, params, appContext, cssHref, hasViewTransition } = input;

	const loaderData = await runLoader(pageModule, request, params, appContext);
	const slotMap = pageModule.defineSlots({ loaderData });
	const meta = resolveMeta(pageModule.meta, loaderData);
	const headContent = buildHeadContent({ meta, cssHref, hasViewTransition });

	const html = renderToString(
		<SlotProvider slots={slotMap}>
			<Template head={headContent} />
		</SlotProvider>,
	);

	return new Response(`<!DOCTYPE html>${html}`, {
		headers: { "content-type": "text/html;charset=utf-8" },
	});
}
