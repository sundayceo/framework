import React from "react";

import { defineErrorPage, type ErrorContext } from "@sundayceo/framework";

const INTERNAL_SERVER_ERROR = 500;

export const page = defineErrorPage(INTERNAL_SERVER_ERROR)({
	template: "default",
	loader: (ctx: { error: ErrorContext }) => ({
		message: ctx.error.message,
		stack: ctx.error.stack,
	}),
	defineSlots: ({ loaderData }) => ({
		header: <h1>500</h1>,
		main: (
			<div>
				<p>Something went wrong: {loaderData.message}</p>
				{loaderData.stack !== undefined && <pre>{loaderData.stack}</pre>}
			</div>
		),
		footer: <p>Built with @sundayceo/framework</p>,
	}),
});
