import { createApp } from "@sundayceo/framework";

type Platform = { env: Record<string, unknown>; ctx: unknown };

export const app = createApp<Platform>({
	context: () => ({ appName: "playground" }),
	onError: (error) => {
		// eslint-disable-next-line no-console
		console.error("[onError hook]", error);
	},
});

declare module "@sundayceo/framework" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Register {
		app: typeof app;
	}
}
