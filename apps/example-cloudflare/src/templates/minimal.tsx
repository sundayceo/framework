import React from "react";

import { Slot, type TemplateComponent } from "@sundayceo/framework";

const MinimalTemplate: TemplateComponent = ({ head }) => (
	<html lang="en">
		<head>
			<meta charSet="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<link rel="stylesheet" href="/src/styles.css" />
			{head}
		</head>
		<body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
			<div className="mx-auto max-w-4xl px-6 py-8">
				<Slot id="content" />
			</div>
		</body>
	</html>
);

export default MinimalTemplate;
