export {};

declare module "@sundayceo/framework" {
	interface TemplateRegistry {
		default: typeof import("./templates/default").default;
	}
}

declare module "@sundayceo/framework" {
	interface RouteMap {
		"/": {};
	}
}
