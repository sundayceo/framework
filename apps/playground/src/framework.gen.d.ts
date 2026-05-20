export {};

declare module "@sundayceo/framework" {
	interface TemplateRegistry {
		default: typeof import("./templates/default").default;
	}
}

declare module "@sundayceo/framework" {
	interface RouteMap {
		"/": {};
		"/api/echo": {};
		"/api/health": {};
		"/async-loader": {};
		"/blog/[slug]": { slug: string };
		"/blog/featured": {};
		"/context-test": {};
		"/demo": {};
		"/docs/[...slug]": { slug: string };
		"/error-test": {};
		"/forbidden-test": {};
		"/full-hydrate": {};
		"/meta-dynamic": {};
		"/meta-static": {};
		"/partial-slots": {};
		"/pricing": {};
		"/redirect-test": {};
		"/request-test": {};
		"/throw-test": {};
		"/typo-slot": {};
		"/users/[id]/posts/[postId]": { id: string; postId: string };
	}
}
