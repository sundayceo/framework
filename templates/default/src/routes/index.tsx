import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/")({
	template: "default",
	defineSlots: () => ({
		header: <h1>{{name}}</h1>,
		main: <p>Welcome to your new project.</p>,
		footer: <p>Built with @sundayceo/framework</p>,
	}),
});
