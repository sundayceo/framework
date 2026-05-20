import React from "react";

import { defineErrorPage, type ErrorContext } from "@sundayceo/framework";

export default defineErrorPage(403)({
	template: "default",
	loader: (ctx: { error: ErrorContext }) => ({
		message: ctx.error.message,
	}),
	defineSlots: ({ loaderData }) => ({
		header: <h1>403</h1>,
		main: <p>Forbidden: {loaderData.message}</p>,
		footer: <p>Built with @sundayceo/framework</p>,
	}),
});
