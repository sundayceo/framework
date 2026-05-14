import React from "react";

import { definePage } from "@sundayceo/framework";

export const page = definePage("/404")({
	template: "default",
	defineSlots: () => ({
		header: <h1>404</h1>,
		main: <p>Page not found.</p>,
		footer: <p>Built with @sundayceo/framework</p>,
	}),
});
