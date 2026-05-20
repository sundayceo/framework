import React from "react";

import { definePage } from "@sundayceo/framework";

import { Counter } from "../components/counter";

export default definePage("/full-hydrate")({
	template: "default",
	loader: () => ({
		title: "Fully Hydrated Page",
	}),
	defineSlots: ({ loaderData }) => ({
		header: <Counter label={`Header: ${loaderData.title}`} />,
		main: <Counter label="Main interactive" />,
		footer: <Counter label="Footer interactive" />,
	}),
});
