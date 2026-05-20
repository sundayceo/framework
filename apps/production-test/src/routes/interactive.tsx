import React from "react";

import { definePage } from "@sundayceo/framework";

import { Counter } from "../components/counter";

export default definePage("/interactive")({
	template: "default",
	meta: { title: "Interactive Page" },
	loader: () => ({ message: "Hydrated from loader data" }),
	defineSlots: ({ loaderData }) => ({
		header: <h1>Interactive Page</h1>,
		main: <Counter label={loaderData.message} />,
		footer: <p>Static footer — no JS</p>,
	}),
});
