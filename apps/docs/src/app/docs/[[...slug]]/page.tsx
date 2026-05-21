import { source } from "@/lib/source";
import type { TOCItemType } from "fumadocs-core/toc";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import type { FC } from "react";

type MDXPageData = {
	title?: string;
	description?: string;
	body: FC<Record<string, unknown>>;
	toc: TOCItemType[];
};

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
	const params = await props.params;
	const page = source.getPage(params.slug);
	if (!page) {
		notFound();
	}

	const data = page.data as unknown as MDXPageData;
	const MDX = data.body;

	return (
		<DocsPage toc={data.toc}>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription>{page.data.description}</DocsDescription>
			<DocsBody>
				<MDX components={{ ...defaultMdxComponents }} />
			</DocsBody>
		</DocsPage>
	);
}

export function generateStaticParams() {
	return source.generateParams();
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }) {
	const params = await props.params;
	const page = source.getPage(params.slug);
	if (!page) {
		notFound();
	}

	return {
		title: page.data.title,
		description: page.data.description,
	};
}
