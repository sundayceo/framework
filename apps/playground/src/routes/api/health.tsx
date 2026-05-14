import { defineHandler } from "@sundayceo/framework";

export const handler = defineHandler("/api/health")({
	GET: () => {
		return Response.json({ status: "ok" }, { headers: { "content-type": "application/json" } });
	},
});
