import { defineHandler, httpError } from "@sundayceo/framework";

const FORBIDDEN = 403;

export default defineHandler("/forbidden-test")({
	GET: () => {
		throw httpError(FORBIDDEN, "Access denied");
	},
});
