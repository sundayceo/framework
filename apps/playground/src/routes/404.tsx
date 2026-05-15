import React from "react";

import { defineErrorPage } from "@sundayceo/framework";

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
export const page = defineErrorPage(404)({
	template: "default",
	defineSlots: () => ({
		header: <h1>404</h1>,
		main: <p>Page not found.</p>,
		footer: <p>Built with @sundayceo/framework</p>,
	}),
});
