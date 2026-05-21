declare module "*.css" {}

declare module "./routeTree.gen" {
	import type { AnyRoute } from "@tanstack/react-router";

	export const routeTree: AnyRoute;
}

declare module "mdx/types" {
	import type { ComponentType } from "react";

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export type MDXComponents = Record<string, ComponentType<any>>;
}

declare module "collections/server" {
	import type { DocsCollectionEntry } from "fumadocs-mdx/runtime/server";

	export const docs: DocsCollectionEntry;
}

declare module "collections/browser" {
	import type { DocCollectionEntry } from "fumadocs-mdx/runtime/browser";

	const browserCollections: {
		docs: DocCollectionEntry;
	};
	export default browserCollections;
}
