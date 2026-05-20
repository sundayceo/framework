import React from "react";

import { definePage } from "@sundayceo/framework";

import { Counter } from "../../components/counter";

export default definePage("/full-hydration")({
	template: "default",
	loader: () => ({
		title: "Fully Hydrated Page",
	}),
	defineSlots: ({ loaderData }) => ({
		header: (
			<div className="space-y-4">
				<a href="/" className="text-sm text-gray-400 hover:text-gray-600">
					← Back
				</a>
				<Counter label={`Header: ${loaderData.title}`} />
			</div>
		),
		main: <Counter label="Main interactive" />,
		footer: <Counter label="Footer interactive" />,
	}),
});
