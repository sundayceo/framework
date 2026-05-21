import { docs } from "@/../.source";
import { loader, type VirtualFile } from "fumadocs-core/source";
import { createMDXSource } from "fumadocs-mdx";

import { resolveIcon } from "./icons";

const mdxSource = createMDXSource(docs.docs, docs.meta) as {
	files: VirtualFile[] | (() => VirtualFile[]);
};
const files = typeof mdxSource.files === "function" ? mdxSource.files() : mdxSource.files;

export const source = loader({
	baseUrl: "/docs",
	icon: resolveIcon,
	source: { files },
});
