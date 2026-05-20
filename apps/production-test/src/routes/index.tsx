import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/")({
	template: "default",
	meta: { title: "Production Test", description: "Static page — zero JS expected" },
	defineSlots: () => ({
		header: <h1>Production Test</h1>,
		main: <p>This is a purely static page. No JavaScript should be shipped.</p>,
		footer: <p>Built with @sundayceo/framework</p>,
	}),
});
