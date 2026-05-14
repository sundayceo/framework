import type { TemplateComponent } from "./core/index";

export function resolveTemplate(
	templateId: string,
	registry: Record<string, TemplateComponent>,
): TemplateComponent {
	const component = registry[templateId];

	if (!component) {
		const keys = Object.keys(registry);
		const suffix =
			keys.length > 0 ? `Available templates: ${keys.join(", ")}` : "No templates registered.";

		throw new Error(`Template "${templateId}" not found. ${suffix}`);
	}

	return component;
}
