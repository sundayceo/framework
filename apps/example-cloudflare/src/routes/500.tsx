import React from "react";

import { defineErrorPage, type ErrorContext } from "@sundayceo/framework";

export default defineErrorPage(500)({
	template: "default",
	loader: (ctx: { error: ErrorContext }) => ({
		message: ctx.error.message,
		stack: ctx.error.stack,
	}),
	defineSlots: ({ loaderData }) => ({
		header: <div />,
		main: (
			<div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
				<p className="text-6xl font-bold text-gray-300">500</p>
				<p className="mt-4 text-xl text-gray-600">Something went wrong: {loaderData.message}</p>
				{loaderData.stack !== undefined && (
					<pre className="mt-4 font-mono text-sm bg-gray-100 rounded px-4 py-2 text-left max-w-xl overflow-auto">
						{loaderData.stack}
					</pre>
				)}
				<a href="/" className="mt-6 text-sm text-blue-600 underline">
					Go home
				</a>
			</div>
		),
		footer: <p className="text-sm text-gray-500">Built with @sundayceo/framework</p>,
	}),
});
