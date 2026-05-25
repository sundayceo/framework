import { defineHandler, httpError } from "@sundayceo/framework";

const FORBIDDEN = 403;

export default defineHandler("/trigger-403")({
	GET: () => {
		throw httpError(FORBIDDEN, "Access denied");
	},
});
