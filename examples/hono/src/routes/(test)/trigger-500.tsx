import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/trigger-500")({
	template: "default",
	loader: () => {
		throw new Error("loader-exploded");
	},
	defineSlots: ({ loaderData: _loaderData }) => ({
		header: <h1 className="text-2xl font-bold tracking-tight">Should not render</h1>,
		main: <p className="text-gray-600">unreachable</p>,
		footer: <p className="text-sm text-gray-500">footer</p>,
	}),
});
