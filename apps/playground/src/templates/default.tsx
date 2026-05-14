import React from "react";

import { Slot, type TemplateComponent } from "@sundayceo/framework";

const DefaultTemplate: TemplateComponent = ({ head }) => (
	<html lang="en">
		<head>
			<meta charSet="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			{head}
		</head>
		<body>
			<header>
				<Slot id="header" />
			</header>
			<main>
				<Slot id="main" />
			</main>
			<footer>
				<Slot id="footer" />
			</footer>
		</body>
	</html>
);

export default DefaultTemplate;
