import { defineHandler } from "@sundayceo/framework";

export default defineHandler("/api/health")({
	GET: () => {
		return Response.json({ status: "ok" }, { headers: { "content-type": "application/json" } });
	},
});
