import handler from "@sundayceo/framework/server-entry";

// eslint-disable-next-line no-restricted-exports
export default {
	fetch: (request: Request, env: unknown, ctx: unknown) => handler.fetch(request, { env, ctx }),
};
