import React from "react";

import { definePage } from "@sundayceo/framework";

export default definePage("/users/[id]/posts/[postId]")({
	template: "default",
	loader: ({ params }) => ({
		userId: params.id,
		postId: params.postId,
	}),
	defineSlots: ({ loaderData }) => ({
		header: <h1>User Post</h1>,
		main: (
			<p data-testid="params">
				user:{loaderData.userId} post:{loaderData.postId}
			</p>
		),
		footer: <p>footer</p>,
	}),
});
