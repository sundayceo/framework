import { defineHandler, redirect } from "@sundayceo/framework";

export default defineHandler("/trigger-redirect")({
	GET: () => {
		throw redirect("/");
	},
});
