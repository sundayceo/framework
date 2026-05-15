export {};

declare module "@sundayceo/framework" {
	interface TemplateRegistry {
		default: typeof import("./templates/default").default;
	}
}

declare module "@sundayceo/framework" {
	interface RouteMap {
		"/": {};
		"/404": {};
		"/404.test": {};
		"/500": {};
		"/500.test": {};
		"/api/health": {};
		"/demo": {};
		"/demo.test": {};
		"/error-test": {};
		"/redirect-test": {};
	}
}
