import { docs } from "collections/server";
import { loader } from "fumadocs-core/source";

import { resolveIcon } from "./icons";

export const source = loader({
	baseUrl: "/docs",
	icon: resolveIcon,
	source: docs.toFumadocsSource(),
});

export function markdownPathToSlugs(segs: string[]) {
	if (segs.length === 0) return [];

	const out = [...segs];
	out[out.length - 1] = out[out.length - 1].replace(/\.md$/, "");
	if (out.length === 1 && out[0] === "index") out.pop();
	return out;
}
