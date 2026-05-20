import { createApp } from "@sundayceo/framework";

type Platform = { env: Record<string, unknown>; ctx: unknown };

export const app = createApp<Platform>({
	context: () => ({ appName: "example-cloudflare" }),
	onError: (error) => {
		console.error("[onError]", error);
	},
});

declare module "@sundayceo/framework" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Register {
		app: typeof app;
	}
}
