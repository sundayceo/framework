import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/meta-dynamic")({
	template: "default",
	loader: () => ({ pageTitle: "Dynamic Title" }),
	meta: ({ loaderData }) => ({
		title: loaderData.pageTitle,
		description: `Description for ${loaderData.pageTitle}`,
	}),
	defineSlots: ({ loaderData }) => ({
		header: (
			<div className="space-y-4">
				<a href="/" className="text-sm text-gray-400 hover:text-gray-600">
					← Back
				</a>
				<h1 className="text-2xl font-bold tracking-tight">{loaderData.pageTitle}</h1>
			</div>
		),
		main: <p className="text-gray-600">has dynamic meta</p>,
		footer: <p className="text-sm text-gray-500">footer</p>,
	}),
});
