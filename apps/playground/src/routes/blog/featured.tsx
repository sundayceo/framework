import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/blog/featured")({
	template: "default",
	loader: () => ({}),
	defineSlots: () => ({
		header: <h1>Featured</h1>,
		main: <p data-testid="page-type">static-route</p>,
		footer: <p>footer</p>,
	}),
});
