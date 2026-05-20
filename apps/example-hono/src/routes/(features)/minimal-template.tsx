import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/minimal-template")({
	template: "minimal",
	defineSlots: () => ({
		content: <p>This page uses the minimal template</p>,
	}),
});
