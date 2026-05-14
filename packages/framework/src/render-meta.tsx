import React, { type ReactNode } from "react";

type MetaInfo = { title?: string; description?: string };

type RenderMetaInput = {
	meta: MetaInfo;
};

export function renderMeta(input: RenderMetaInput): ReactNode {
	const { meta } = input;
	return (
		<>
			{meta.title !== undefined && <title>{meta.title}</title>}
			{meta.description !== undefined && <meta name="description" content={meta.description} />}
		</>
	);
}
