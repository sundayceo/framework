export type AppConfig<TCustom extends Record<string, unknown>> = {
	context: (request: Request) => TCustom | Promise<TCustom>;
	onError?: (error: unknown, request: Request) => Response | Promise<Response>;
};

export function createApp<TCustom extends Record<string, unknown>>(
	config: AppConfig<TCustom>,
): AppConfig<TCustom> {
	return config;
}
