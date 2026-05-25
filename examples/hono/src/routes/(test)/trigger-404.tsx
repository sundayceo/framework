import { defineHandler, httpError } from "@sundayceo/framework";

const NOT_FOUND = 404;

export default defineHandler("/trigger-404")({
	GET: () => {
		throw httpError(NOT_FOUND, "Not Found");
	},
});
