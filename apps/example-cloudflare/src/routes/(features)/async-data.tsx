import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/async-data")({
	template: "default",
	loader: async () => {
		const delay = 50;
		await new Promise((resolve) => setTimeout(resolve, delay));
		return { message: "async-data-loaded" };
	},
	defineSlots: ({ loaderData }) => ({
		header: (
			<div className="space-y-4">
				<a href="/" className="text-sm text-gray-400 hover:text-gray-600">
					← Back
				</a>
				<h1 className="text-2xl font-bold tracking-tight">Async Loader Test</h1>
			</div>
		),
		main: (
			<p className="font-mono text-sm bg-gray-100 rounded px-2 py-1" data-testid="async-result">
				{loaderData.message}
			</p>
		),
		footer: <p className="text-sm text-gray-500">footer</p>,
	}),
});
