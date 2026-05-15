import handler from "@sundayceo/framework/server-entry";

export default {
	fetch: (request: Request, env: unknown, ctx: unknown) =>
		handler.fetch(request, { env, ctx }),
};
