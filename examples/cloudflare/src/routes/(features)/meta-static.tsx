import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/meta-static")({
	template: "default",
	meta: { title: "Static Title", description: "Static description" },
	loader: () => ({}),
	defineSlots: () => ({
		header: (
			<div className="space-y-4">
				<a href="/" className="text-sm text-gray-400 hover:text-gray-600">
					← Back
				</a>
				<h1 className="text-2xl font-bold tracking-tight">Meta Static Test</h1>
			</div>
		),
		main: <p className="text-gray-600">has static meta</p>,
		footer: <p className="text-sm text-gray-500">footer</p>,
	}),
});
