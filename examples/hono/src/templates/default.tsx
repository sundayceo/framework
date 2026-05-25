import React from "react";

import { Slot, type TemplateComponent } from "@sundayceo/framework";

const DefaultTemplate: TemplateComponent = ({ head }) => (
	<html lang="en">
		<head>
			<meta charSet="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<link rel="stylesheet" href="/src/styles.css" />
			{head}
		</head>
		<body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
			<header className="border-b border-gray-200 bg-white">
				<div className="mx-auto max-w-4xl px-6 py-4">
					<Slot id="header" />
				</div>
			</header>
			<main className="mx-auto max-w-4xl px-6 py-8">
				<Slot id="main" fallback={<p className="text-gray-500">No content provided.</p>} />
			</main>
			<footer className="mt-auto border-t border-gray-200 bg-white">
				<div className="mx-auto max-w-4xl px-6 py-4 text-sm text-gray-500">
					<Slot
						id="footer"
						fallback={<p>Built with @sundayceo/framework</p>}
					/>
				</div>
			</footer>
		</body>
	</html>
);

export default DefaultTemplate;
