import { defineHandler } from "@sundayceo/framework";

export const handler = defineHandler("/api/health")({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	GET: () => {
		return Response.json({ status: "ok" }, { headers: { "content-type": "application/json" } });
	},
});
