import React, { type ReactNode } from "react";

type MetaInfo = { title?: string; description?: string };

type RenderMetaInput = {
	meta: MetaInfo;
	viewTransition?: boolean;
};

export function renderMeta(input: RenderMetaInput): ReactNode {
	const { meta, viewTransition } = input;
	return (
		<>
			{meta.title !== undefined && <title>{meta.title}</title>}
			{meta.description !== undefined && <meta name="description" content={meta.description} />}
			{viewTransition === true && <meta name="view-transition" content="same-origin" />}
		</>
	);
}
