import { defineHandler, httpError } from "@sundayceo/framework";

const FORBIDDEN = 403;

export default defineHandler("/forbidden-test")({
	GET: () => {
		httpError(FORBIDDEN, "Access denied");
	},
});
