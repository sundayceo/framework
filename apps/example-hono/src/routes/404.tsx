import React from "react";

import { defineErrorPage } from "@sundayceo/framework";

export default defineErrorPage(404)({
	template: "default",
	defineSlots: () => ({
		header: <div />,
		main: (
			<div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
				<p className="text-6xl font-bold text-gray-300">404</p>
				<p className="mt-4 text-xl text-gray-600">Page not found.</p>
				<a href="/" className="mt-6 text-sm text-blue-600 underline">
					Go home
				</a>
			</div>
		),
		footer: <p className="text-sm text-gray-500">Built with @sundayceo/framework</p>,
	}),
});
