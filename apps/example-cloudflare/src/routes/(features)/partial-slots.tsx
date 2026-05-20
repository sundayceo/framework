import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/partial-slots")({
	template: "default",
	loader: () => ({}),
	defineSlots: () => ({
		header: (
			<div className="space-y-4">
				<a href="/" className="text-sm text-gray-400 hover:text-gray-600">
					← Back
				</a>
				<h1 className="text-2xl font-bold tracking-tight">Only Header</h1>
			</div>
		),
	}),
});
