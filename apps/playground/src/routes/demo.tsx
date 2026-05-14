import React from "react";

import { definePage } from "@sundayceo/framework";

import { Counter } from "../components/counter";

export const page = definePage("/demo")({
	template: "default",
	loader: () => ({
		title: "Demo Page",
		description: "A page demonstrating loader data, interactive and static slots.",
	}),
	defineSlots: ({ loaderData }) => ({
		header: <h1>{loaderData.title}</h1>,
		main: <Counter label={loaderData.description} />,
		footer: <p>Static footer content</p>,
	}),
});
