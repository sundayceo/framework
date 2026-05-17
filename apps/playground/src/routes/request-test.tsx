import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/request-test")({
	template: "default",
	loader: ({ request }) => {
		const url = new URL(request.url);
		const name = url.searchParams.get("name") ?? "world";
		return { greeting: `hello-${name}` };
	},
	defineSlots: ({ loaderData }) => ({
		header: <h1>Request Test</h1>,
		main: <p data-testid="greeting">{loaderData.greeting}</p>,
		footer: <p>footer</p>,
	}),
});
