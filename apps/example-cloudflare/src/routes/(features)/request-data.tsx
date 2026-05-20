import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/request-data")({
	template: "default",
	loader: ({ request }) => {
		const url = new URL(request.url);
		const name = url.searchParams.get("name") ?? "world";
		return { greeting: `hello-${name}` };
	},
	defineSlots: ({ loaderData }) => ({
		header: (
			<div className="space-y-4">
				<a href="/" className="text-sm text-gray-400 hover:text-gray-600">
					← Back
				</a>
				<h1 className="text-2xl font-bold tracking-tight">Request Test</h1>
			</div>
		),
		main: (
			<p className="font-mono text-sm bg-gray-100 rounded px-2 py-1" data-testid="greeting">
				{loaderData.greeting}
			</p>
		),
		footer: <p className="text-sm text-gray-500">footer</p>,
	}),
});
