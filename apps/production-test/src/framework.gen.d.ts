export {};

declare module "@sundayceo/framework" {
	interface TemplateRegistry {
		alternate: typeof import("./templates/alternate").default;
		default: typeof import("./templates/default").default;
	}
}

declare module "@sundayceo/framework" {
	interface RouteMap {
		"/": {};
		"/alternate-template": {};
		"/api/health": {};
		"/interactive": {};
	}
}
