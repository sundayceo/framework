import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/alternate-template")({
	template: "alternate",
	defineSlots: () => ({
		content: <p>This page uses the alternate template</p>,
	}),
});
