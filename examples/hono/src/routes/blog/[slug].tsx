import React from "react";

import { definePage } from "@sundayceo/framework";

import { Counter } from "../../components/counter";

export default definePage("/blog/[slug]")({
	template: "default",
	loader: ({ params }) => {
		return { slug: params.slug };
	},
	defineSlots: ({ loaderData }) => ({
		header: (
			<div className="space-y-4">
				<a href="/" className="text-sm text-gray-400 hover:text-gray-600">
					← Back
				</a>
				<h1 className="text-2xl font-bold tracking-tight">Blog Post</h1>
			</div>
		),
		main: (
			<div className="mt-4 space-y-4" data-testid="slug">
				<p className="font-mono text-sm bg-gray-100 rounded px-2 py-1">slug:{loaderData.slug}</p>
				<Counter label={`Like ${loaderData.slug}`} />
			</div>
		),
		footer: <p className="text-sm text-gray-500">footer</p>,
	}),
});
