import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/context-test")({
	template: "default",
	loader: (ctx) => {
		return { appName: String(ctx.appName) };
	},
	defineSlots: ({ loaderData }) => ({
		header: <h1>Context Test</h1>,
		main: <p data-testid="app-name">app:{loaderData.appName}</p>,
		footer: <p>footer</p>,
	}),
});
