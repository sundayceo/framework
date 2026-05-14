import type { ReactNode } from "react";
import { expect, test } from "vitest";

import type { TemplateComponent } from "./core/index";
import { resolveTemplate } from "./template-resolver";

const FakeTemplate: TemplateComponent = ({ head }: { head: ReactNode }) => null;

test("returns the matching template component for a valid ID", () => {
	const registry: Record<string, TemplateComponent> = {
		default: FakeTemplate,
	};

	const result = resolveTemplate("default", registry);

	expect(result).toBe(FakeTemplate);
});

test("throws with available template list when ID is not found", () => {
	const MarketingTemplate: TemplateComponent = ({ head }: { head: ReactNode }) => null;

	const registry: Record<string, TemplateComponent> = {
		default: FakeTemplate,
		marketing: MarketingTemplate,
	};

	expect(() => resolveTemplate("foo", registry)).toThrowError(
		'Template "foo" not found. Available templates: default, marketing',
	);
});

test("throws with 'no templates registered' message for empty registry", () => {
	const registry: Record<string, TemplateComponent> = {};

	expect(() => resolveTemplate("foo", registry)).toThrowError(
		'Template "foo" not found. No templates registered.',
	);
});
