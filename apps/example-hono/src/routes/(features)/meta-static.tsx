import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/meta-static")({
	template: "default",
	meta: { title: "Static Title", description: "Static description" },
	loader: () => ({}),
	defineSlots: () => ({
		header: <h1>Meta Static Test</h1>,
		main: <p>has static meta</p>,
		footer: <p>footer</p>,
	}),
});
