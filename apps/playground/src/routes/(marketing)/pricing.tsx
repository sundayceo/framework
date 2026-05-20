import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/pricing")({
	template: "default",
	loader: () => ({ plan: "pro" }),
	defineSlots: ({ loaderData }) => ({
		header: <h1>Pricing</h1>,
		main: (
			<div data-testid="pricing">
				<p>Best plan: {loaderData.plan}</p>
			</div>
		),
		footer: <p>footer</p>,
	}),
});
