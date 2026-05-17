import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/throw-test")({
	template: "default",
	loader: () => {
		throw new Error("loader-exploded");
	},
	defineSlots: ({ loaderData: _loaderData }) => ({
		header: <h1>Should not render</h1>,
		main: <p>unreachable</p>,
		footer: <p>footer</p>,
	}),
});
