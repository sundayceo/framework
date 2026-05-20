import React from "react";

import { defineErrorPage } from "@sundayceo/framework";

export default defineErrorPage(404)({
	template: "default",
	defineSlots: () => ({
		header: <h1>404</h1>,
		main: <p>Page Not Found</p>,
	}),
});
