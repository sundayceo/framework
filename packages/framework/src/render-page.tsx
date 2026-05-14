import React, { type ReactNode } from "react";
import { renderToString } from "react-dom/server";

import type { SlotMap, TemplateComponent } from "./core/index";
import { SlotProvider } from "./slot";

type MetaInfo = { title?: string; description?: string };

type RenderablePageModule = {
	defineSlots: (args: { loaderData: unknown }) => SlotMap;
	meta?: MetaInfo | ((args: { loaderData: unknown }) => MetaInfo);
};

type RenderPageInput = {
	pageModule: RenderablePageModule;
	template: TemplateComponent;
	loaderData: unknown;
	cssHref?: string;
};

function resolveMeta(input: { meta: RenderablePageModule["meta"]; loaderData: unknown }): MetaInfo {
	const { meta, loaderData } = input;
	if (meta === undefined) {
		return {};
	}
	if (typeof meta === "function") {
		return meta({ loaderData });
	}
	return meta;
}

function buildHeadContent(input: { meta: MetaInfo; cssHref?: string }): ReactNode {
	const { meta, cssHref } = input;
	return (
		<>
			<meta charSet="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			{meta.title !== undefined && <title>{meta.title}</title>}
			{meta.description !== undefined && <meta name="description" content={meta.description} />}
			{cssHref !== undefined && <link rel="stylesheet" href={cssHref} />}
		</>
	);
}

export function renderPage(input: RenderPageInput): Response {
	const { pageModule, template: Template, loaderData, cssHref } = input;

	const slotMap = pageModule.defineSlots({ loaderData });
	const meta = resolveMeta({ meta: pageModule.meta, loaderData });
	const headContent = buildHeadContent({ meta, cssHref });

	const html = renderToString(
		<SlotProvider slots={slotMap}>
			<Template head={headContent} />
		</SlotProvider>,
	);

	return new Response(`<!DOCTYPE html>${html}`, {
		headers: { "content-type": "text/html;charset=utf-8" },
	});
}
