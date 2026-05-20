import { definePage } from "@sundayceo/framework";

export default definePage("/docs/[...slug]")({
	template: "default",
	loader: (ctx) => ({ slug: ctx.params.slug }),
	defineSlots: ({ loaderData }) => ({
		header: (
			<div className="space-y-4">
				<a href="/" className="text-sm text-gray-400 hover:text-gray-600">
					← Back
				</a>
				<h1 className="text-2xl font-bold tracking-tight">Docs</h1>
			</div>
		),
		main: (
			<article className="mt-4">
				<p className="text-gray-600">
					Viewing:{" "}
					<span className="font-mono text-sm bg-gray-100 rounded px-2 py-1">{loaderData.slug}</span>
				</p>
			</article>
		),
		footer: <p className="text-sm text-gray-500">Built with @sundayceo/framework</p>,
	}),
});
