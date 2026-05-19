import { createContext, useContext, type ReactNode } from "react";

import type { SlotMap } from "./types";

export const SlotContext = createContext<SlotMap>({});

export function SlotProvider({
	slots,
	children,
}: {
	slots: SlotMap;
	children: ReactNode;
}): ReactNode {
	return <SlotContext.Provider value={slots}>{children}</SlotContext.Provider>;
}

export function Slot({ id, fallback }: { id: string; fallback?: ReactNode }): ReactNode {
	const slots = useContext(SlotContext);
	const content = slots[id] ?? fallback ?? null;
	return <div data-slot={id}>{content}</div>;
}
