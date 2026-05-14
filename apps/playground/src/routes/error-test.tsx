import { defineHandler, httpError } from "@sundayceo/framework";

const NOT_FOUND = 404;

export const handler = defineHandler("/error-test")({
	GET: () => {
		httpError(NOT_FOUND, "Not Found");
	},
});
