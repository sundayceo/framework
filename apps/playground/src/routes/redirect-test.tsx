import { defineHandler, redirect } from "@sundayceo/framework";

export const handler = defineHandler("/redirect-test")({
	GET: () => {
		redirect("/");
	},
});
