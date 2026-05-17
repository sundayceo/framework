import { defineHandler } from "@sundayceo/framework";

export default defineHandler("/api/echo")({
	GET: ({ request }) => {
		const url = new URL(request.url);
		return Response.json({ method: "GET", query: url.search });
	},
	POST: async ({ request }) => {
		const body = await request.text();
		return Response.json({ method: "POST", body });
	},
	PUT: ({ request: _request }) => {
		return new Response("put-ok", {
			status: 200,
			headers: { "x-custom": "test-header" },
		});
	},
	DELETE: () => {
		return new Response(null, { status: 204 });
	},
});
