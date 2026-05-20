import React from "react";

import { defineErrorPage, type ErrorContext } from "@sundayceo/framework";

export default defineErrorPage(403)({
	template: "default",
	loader: (ctx: { error: ErrorContext }) => ({
		message: ctx.error.message,
	}),
	defineSlots: ({ loaderData }) => ({
		header: <div />,
		main: (
			<div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
				<p className="text-6xl font-bold text-gray-300">403</p>
				<p className="mt-4 text-xl text-gray-600">Forbidden: {loaderData.message}</p>
				<a href="/" className="mt-6 text-sm text-blue-600 underline">
					Go home
				</a>
			</div>
		),
		footer: <p className="text-sm text-gray-500">Built with @sundayceo/framework</p>,
	}),
});
