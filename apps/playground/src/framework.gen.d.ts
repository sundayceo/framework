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
		"/error-test": {};
		"/meta-dynamic": {};
		"/meta-static": {};
		"/partial-slots": {};
		"/redirect-test": {};
		"/request-test": {};
		"/throw-test": {};
		"/typo-slot": {};
		"/users/[id]/posts/[postId]": { id: string; postId: string };
	}
}
