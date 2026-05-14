import { defineHandler, redirect } from "@sundayceo/framework";

export const handler = defineHandler("/redirect-test")({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	GET: () => {
		redirect("/");
	},
});
