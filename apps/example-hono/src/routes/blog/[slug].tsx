import React from "react";

import { definePage } from "@sundayceo/framework";

import { Counter } from "../../components/counter";

export default definePage("/blog/[slug]")({
	template: "default",
	loader: ({ params }) => {
		return { slug: params.slug };
	},
	defineSlots: ({ loaderData }) => ({
		header: <h1>Blog Post</h1>,
		main: (
			<div data-testid="slug">
				<p>slug:{loaderData.slug}</p>
				<Counter label={`Like ${loaderData.slug}`} />
			</div>
		),
		footer: <p>footer</p>,
	}),
});
