import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/typo-slot")({
	template: "default",
	loader: () => ({}),
	defineSlots: () => ({
		headr: <h1>Typo Slot</h1>,
		main: <p>main</p>,
		footer: <p>footer</p>,
	}),
});
