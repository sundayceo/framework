import { definePage } from "@sundayceo/framework";

export default definePage("/docs/[...slug]")({
	template: "default",
	loader: (ctx) => ({ slug: ctx.params.slug }),
	defineSlots: ({ loaderData }) => ({
		header: <h1>Docs</h1>,
		main: (
			<article>
				<p>Viewing: {loaderData.slug}</p>
			</article>
		),
		footer: <p>Built with @sundayceo/framework</p>,
	}),
});
