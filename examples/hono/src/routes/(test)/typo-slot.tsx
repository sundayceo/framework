import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/typo-slot")({
	template: "default",
	loader: () => ({}),
	defineSlots: () => ({
		headr: <h1 className="text-2xl font-bold tracking-tight">Typo Slot</h1>,
		main: <p className="text-gray-600">main</p>,
		footer: <p className="text-sm text-gray-500">footer</p>,
	}),
});
