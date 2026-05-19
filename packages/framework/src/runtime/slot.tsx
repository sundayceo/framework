import { createContext, useContext, type ReactNode } from "react";

import type { SlotMap } from "./types";

/** React context that provides the current page's slot map to Slot components. */
export const SlotContext = createContext<SlotMap>({});

/** Provides a slot map to descendant Slot components via React context. */
export function SlotProvider({
	slots,
	children,
}: {
	slots: SlotMap;
	children: ReactNode;
}): ReactNode {
	return <SlotContext.Provider value={slots}>{children}</SlotContext.Provider>;
}

/** Renders a named slot's content from context, falling back to a default if not provided. */
export function Slot({ id, fallback }: { id: string; fallback?: ReactNode }): ReactNode {
	const slots = useContext(SlotContext);
	const content = slots[id] ?? fallback ?? null;
	return <div data-slot={id}>{content}</div>;
}
