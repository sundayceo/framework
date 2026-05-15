import React from "react";

import { defineErrorPage } from "@sundayceo/framework";

const NOT_FOUND = 404;

export const page = defineErrorPage(NOT_FOUND)({
	template: "default",
	defineSlots: () => ({
		header: <h1>404</h1>,
		main: <p>Page not found.</p>,
		footer: <p>Built with @sundayceo/framework</p>,
	}),
});
