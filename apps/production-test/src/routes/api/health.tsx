import { defineHandler } from "@sundayceo/framework";

export default defineHandler("/api/health")({
	GET: () => Response.json({ status: "ok" }),
});
