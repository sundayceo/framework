import React, { type ReactNode } from "react";
import { renderToString } from "react-dom/server";

import type { SlotMap, TemplateComponent } from "./core/index";
import { renderMeta } from "./render-meta";
import { resolveMeta } from "./resolve-meta";
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
	hasViewTransition?: boolean;
};

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
			{renderMeta({ meta, hasViewTransition })}
			{cssHref !== undefined && <link rel="stylesheet" href={cssHref} />}
		</>
	);
}

export function renderPage(input: RenderPageInput): Response {
	const { pageModule, template: Template, loaderData, cssHref, hasViewTransition } = input;

	const slotMap = pageModule.defineSlots({ loaderData });
	const meta = resolveMeta({ meta: pageModule.meta, loaderData });
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
