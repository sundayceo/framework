import { Children, isValidElement, type ReactNode } from "react";

import { Slot } from "./slot";
import type { TemplateComponent } from "./types";

type ExtractSlotsResult = {
	slots: string[];
	requiredSlots: string[];
};

type SlotProps = {
	id: string;
	fallback?: ReactNode;
	children?: ReactNode;
};

type WalkState = {
	slots: string[];
	requiredSlots: string[];
	seen: Set<string>;
};

function walkTree(node: ReactNode, state: WalkState): void {
	if (!isValidElement<SlotProps>(node)) {
		return;
	}

	if (node.type === Slot) {
		const { id } = node.props;

		if (state.seen.has(id)) {
			throw new Error(`Duplicate slot ID: "${id}"`);
		}

		state.seen.add(id);
		state.slots.push(id);

		if (node.props.fallback === undefined) {
			state.requiredSlots.push(id);
		}
	}

	Children.forEach(node.props.children, (child) => {
		walkTree(child, state);
	});
}

/** Walks a template's render tree to discover all declared Slot IDs and which are required. */
export function extractSlots(template: TemplateComponent): ExtractSlotsResult {
	const tree = template({ head: null });
	const node: ReactNode = tree instanceof Promise ? null : tree;

	const state: WalkState = {
		slots: [],
		requiredSlots: [],
		seen: new Set<string>(),
	};

	walkTree(node, state);

	return { slots: state.slots, requiredSlots: state.requiredSlots };
}
