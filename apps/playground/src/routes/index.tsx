import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/")({
	template: "default",
	defineSlots: () => ({
		header: <h1>Playground</h1>,
		main: <p>Welcome to the Sunday CEO playground.</p>,
		footer: <p>Built with @sundayceo/framework</p>,
	}),
});
