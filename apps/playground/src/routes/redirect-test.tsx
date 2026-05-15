import { defineHandler, redirect } from "@sundayceo/framework";

export default defineHandler("/redirect-test")({
	GET: () => {
		redirect("/");
	},
});
