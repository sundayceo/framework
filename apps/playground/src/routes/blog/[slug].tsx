import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/blog/[slug]")({
	template: "default",
	loader: ({ params }) => {
		return { slug: params.slug };
	},
	defineSlots: ({ loaderData }) => ({
		header: <h1>Blog Post</h1>,
		main: <p data-testid="slug">slug:{loaderData.slug}</p>,
		footer: <p>footer</p>,
	}),
});
