import React from "react";

import { definePage } from "@sundayceo/framework";

import { Counter } from "../../components/counter";

export default definePage("/counter")({
	template: "default",
	loader: () => ({
		title: "Demo Page",
		description: "A page demonstrating loader data, interactive and static slots.",
	}),
	defineSlots: ({ loaderData }) => ({
		header: (
			<div className="space-y-4">
				<a href="/" className="text-sm text-gray-400 hover:text-gray-600">
					← Back
				</a>
				<h1 className="text-2xl font-bold tracking-tight">{loaderData.title}</h1>
			</div>
		),
		main: <Counter label={loaderData.description} />,
		footer: <p className="text-sm text-gray-500">Static footer content</p>,
	}),
});
