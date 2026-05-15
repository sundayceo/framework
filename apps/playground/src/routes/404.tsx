import React from "react";

import { defineErrorPage } from "@sundayceo/framework";

export default defineErrorPage(404)({
	template: "default",
	defineSlots: () => ({
		header: <h1>404</h1>,
		main: <p>Page not found.</p>,
		footer: <p>Built with @sundayceo/framework</p>,
	}),
});
