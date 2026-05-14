import React from "react";

import { definePage } from "@sundayceo/framework";

export const page = definePage("/500")({
	template: "default",
	defineSlots: () => ({
		header: <h1>500</h1>,
		main: <p>Something went wrong.</p>,
		footer: <p>Built with @sundayceo/framework</p>,
	}),
});
