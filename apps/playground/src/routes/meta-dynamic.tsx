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
		header: <h1>{loaderData.pageTitle}</h1>,
		main: <p>has dynamic meta</p>,
		footer: <p>footer</p>,
	}),
});
