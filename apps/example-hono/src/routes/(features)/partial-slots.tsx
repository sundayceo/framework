import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/partial-slots")({
	template: "default",
	loader: () => ({}),
	defineSlots: () => ({
		header: <h1>Only Header</h1>,
	}),
});
