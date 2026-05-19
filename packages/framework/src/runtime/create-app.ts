export type AppConfig<
	TCustom extends Record<string, unknown> = Record<string, unknown>,
	TPlatform = unknown,
> = {
	context: (request: Request, platform?: TPlatform) => TCustom | Promise<TCustom>;
	onError?: (error: unknown, request: Request) => void | Promise<void>;
};

export function createApp<
	TPlatform = unknown,
	TCustom extends Record<string, unknown> = Record<string, unknown>,
>(config: AppConfig<TCustom, TPlatform>): AppConfig<TCustom, TPlatform> {
	return config;
}
