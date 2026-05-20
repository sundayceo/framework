import React from "react";

import { Slot, type TemplateComponent } from "@sundayceo/framework";

const AlternateTemplate: TemplateComponent = ({ head }) => (
	<html lang="en">
		<head>
			<meta charSet="utf-8" />
			{head}
		</head>
		<body>
			<div id="app">
				<Slot id="content" />
			</div>
		</body>
	</html>
);

export default AlternateTemplate;
