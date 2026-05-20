import { createContext, useContext, type ReactNode } from "react";

import type { SlotMap } from "./types";

type HydrationMeta = {
	interactivity?: Record<string, boolean>;
	serializedData?: string;
	assetPaths?: Record<string, string>;
	routePath?: string;
};

type SlotContextValue = {
	slots: SlotMap;
	hydration?: HydrationMeta;
};

/** React context that provides the current page's slot map and hydration metadata to Slot components. */
export const SlotContext = createContext<SlotContextValue>({ slots: {} });

function resolveAssetPath(slotId: string, hydration: HydrationMeta): string {
	const resolved = hydration.assetPaths?.[slotId];
	if (resolved !== undefined) {
		return resolved;
	}
	return `virtual:hydrate${hydration.routePath ?? ""}/${slotId}`;
}

/** Provides a slot map and optional hydration metadata to descendant Slot components via React context. */
export function SlotProvider({
	slots,
	hydration,
	children,
}: {
	slots: SlotMap;
	hydration?: HydrationMeta;
	children: ReactNode;
}): ReactNode {
	return <SlotContext.Provider value={{ slots, hydration }}>{children}</SlotContext.Provider>;
}

/** Renders a named slot's content from context, falling back to a default if not provided. */
export function Slot({ id, fallback }: { id: string; fallback?: ReactNode }): ReactNode {
	const { slots, hydration } = useContext(SlotContext);
	const content = slots[id] ?? fallback ?? null;

	const isInteractive = hydration?.interactivity?.[id] === true;

	if (!isInteractive) {
		return <div data-slot={id}>{content}</div>;
	}

	const assetPath = resolveAssetPath(id, hydration);

	return (
		<>
			<div data-hydrate={id}>{content}</div>
			<script
				type="application/json"
				data-hydrate-data={id}
				dangerouslySetInnerHTML={{ __html: hydration.serializedData ?? "{}" }}
			/>
			<script type="module">{`import "${assetPath}";`}</script>
		</>
	);
}
