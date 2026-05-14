type MetaInfo = { title?: string; description?: string };

type MetaField = MetaInfo | ((args: { loaderData: unknown }) => MetaInfo) | undefined;

type ResolveMetaInput = {
	meta: MetaField;
	loaderData: unknown;
};

export function resolveMeta(input: ResolveMetaInput): MetaInfo {
	const { meta, loaderData } = input;
	if (meta === undefined) {
		return {};
	}
	if (typeof meta === "function") {
		return meta({ loaderData });
	}
	return meta;
}
