import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/blog/featured")({
	template: "default",
	loader: () => ({}),
	defineSlots: () => ({
		header: (
			<div className="space-y-4">
				<a href="/" className="text-sm text-gray-400 hover:text-gray-600">
					← Back
				</a>
				<h1 className="text-2xl font-bold tracking-tight">Featured</h1>
			</div>
		),
		main: (
			<p className="font-mono text-sm bg-gray-100 rounded px-2 py-1" data-testid="page-type">
				static-route
			</p>
		),
		footer: <p className="text-sm text-gray-500">footer</p>,
	}),
});
