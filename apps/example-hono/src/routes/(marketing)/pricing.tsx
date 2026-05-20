import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/pricing")({
	template: "default",
	loader: () => ({ plan: "pro" }),
	defineSlots: ({ loaderData }) => ({
		header: (
			<div className="space-y-4">
				<a href="/" className="text-sm text-gray-400 hover:text-gray-600">
					← Back
				</a>
				<h1 className="text-2xl font-bold tracking-tight">Pricing</h1>
			</div>
		),
		main: (
			<div className="mt-4 space-y-4" data-testid="pricing">
				<p className="text-gray-600">
					Best plan:{" "}
					<span className="font-mono text-sm bg-gray-100 rounded px-2 py-1">{loaderData.plan}</span>
				</p>
			</div>
		),
		footer: <p className="text-sm text-gray-500">footer</p>,
	}),
});
