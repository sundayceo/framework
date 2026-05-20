import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/async-loader")({
	template: "default",
	loader: async () => {
		const delay = 50;
		await new Promise((resolve) => setTimeout(resolve, delay));
		return { message: "async-data-loaded" };
	},
	defineSlots: ({ loaderData }) => ({
		header: <h1>Async Loader Test</h1>,
		main: <p data-testid="async-result">{loaderData.message}</p>,
		footer: <p>footer</p>,
	}),
});
