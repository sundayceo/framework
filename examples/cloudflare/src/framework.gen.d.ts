export {};

declare module "@sundayceo/framework" {
	interface TemplateRegistry {
		default: typeof import("./templates/default").default;
		minimal: typeof import("./templates/minimal").default;
	}
}

declare module "@sundayceo/framework" {
	interface RouteMap {
		"/": {};
		"/api/echo": {};
		"/api/health": {};
		"/app-context": {};
		"/async-data": {};
		"/blog/[slug]": { slug: string };
		"/blog/featured": {};
		"/counter": {};
		"/docs/[...slug]": { slug: string };
		"/full-hydration": {};
		"/meta-dynamic": {};
		"/meta-static": {};
		"/minimal-template": {};
		"/partial-slots": {};
		"/pricing": {};
		"/request-data": {};
		"/trigger-403": {};
		"/trigger-404": {};
		"/trigger-500": {};
		"/trigger-redirect": {};
		"/typo-slot": {};
		"/users/[id]/posts/[postId]": { id: string; postId: string };
	}
}
