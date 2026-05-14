import { isValidElement, type ReactElement, type ReactNode } from "react";

import type { TemplateComponent } from "./core/index";
import { Slot } from "./slot";

type ExtractSlotsResult = {
	slots: string[];
	requiredSlots: string[];
};

function walkTree(
	node: ReactNode,
	slots: string[],
	requiredSlots: string[],
	seen: Set<string>,
): void {
	if (!isValidElement(node)) {
		return;
	}

	const element = node as ReactElement<Record<string, unknown>>;

	if (element.type === Slot) {
		const id = element.props.id as string;

		if (seen.has(id)) {
			throw new Error(`Duplicate slot ID: "${id}"`);
		}

		seen.add(id);
		slots.push(id);

		if (element.props.fallback === undefined) {
			requiredSlots.push(id);
		}
	}

	// Walk children
	const children = element.props.children;

	if (Array.isArray(children)) {
		for (const child of children) {
			walkTree(child, slots, requiredSlots, seen);
		}
	} else if (children !== undefined) {
		walkTree(children as ReactNode, slots, requiredSlots, seen);
	}
}

export function extractSlots(template: TemplateComponent): ExtractSlotsResult {
	const tree = template({ head: null }) as ReactNode;

	const slots: string[] = [];
	const requiredSlots: string[] = [];
	const seen = new Set<string>();

	walkTree(tree, slots, requiredSlots, seen);

	return { slots, requiredSlots };
}
