import { serve } from "@hono/node-server";
import { Hono } from "hono";

import handler from "@sundayceo/framework/server-entry";

const app = new Hono();

app.all("*", (c) => handler.fetch(c.req.raw));

const PORT = 3000;

serve({ fetch: app.fetch, port: PORT }, (info) => {
	console.log(`Listening on http://localhost:${String(info.port)}`);
});
