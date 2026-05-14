import { createApp } from "@sundayceo/framework";

export const app = createApp({
	context: () => ({}),
});

declare module "@sundayceo/framework" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Register {
		app: typeof app;
	}
}
