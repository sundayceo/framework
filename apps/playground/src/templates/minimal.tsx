import React from "react";

import { Slot, type TemplateComponent } from "@sundayceo/framework";

const MinimalTemplate: TemplateComponent = ({ head }) => (
	<html lang="en">
		<head>
			<meta charSet="utf-8" />
			{head}
		</head>
		<body>
			<Slot id="content" />
		</body>
	</html>
);

export default MinimalTemplate;
