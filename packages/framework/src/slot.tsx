import { createContext, useContext, type ReactNode } from "react";

import type { SlotMap } from "./core/index";

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
	return <>{slots[id] ?? fallback ?? null}</>;
}
