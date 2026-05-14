import React, { type ReactNode } from "react";

type MetaInfo = { title?: string; description?: string };

type RenderMetaInput = {
	meta: MetaInfo;
	hasViewTransition?: boolean;
};

export function renderMeta(input: RenderMetaInput): ReactNode {
	const { meta, hasViewTransition } = input;
	return (
		<>
			{meta.title !== undefined && <title>{meta.title}</title>}
			{meta.description !== undefined && <meta name="description" content={meta.description} />}
			{hasViewTransition === true && <meta name="view-transition" content="same-origin" />}
		</>
	);
}
