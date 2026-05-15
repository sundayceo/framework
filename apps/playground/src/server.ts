import {
	createRequestHandler,
	type HandlerModule,
	type PageModule,
	type TemplateComponent,
} from "@sundayceo/framework";

import { app } from "./app";
import { routes, templates } from "./routes.gen";

type TemplateId = keyof typeof templates;

function isTemplateId(id: string): id is TemplateId {
	return id in templates;
}

function isPageModule(value: unknown): value is PageModule {
	return typeof value === "object" && value !== null && "template" in value;
}

function isHandlerModule(value: unknown): value is HandlerModule {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
	return methods.some((m) => m in value);
}

function pickRouteModule(mod: Record<string, unknown>): PageModule | HandlerModule {
	for (const value of Object.values(mod)) {
		if (isPageModule(value)) {
			return value;
		}
		if (isHandlerModule(value)) {
			return value;
		}
	}
	throw new Error("Route module must export a page or handler");
}

async function loadTemplate(id: string): Promise<TemplateComponent> {
	if (!isTemplateId(id)) {
		throw new Error(`Unknown template: ${id}`);
	}
	const mod = await templates[id]();
	return mod.default;
}

const handler = createRequestHandler({
	app,
	getRoutes: () => routes,
	loadRouteModule: async (route) => pickRouteModule(await route.load()),
	loadTemplate,
});

export default handler;
