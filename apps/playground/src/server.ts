import { createRequestHandler } from "@sundayceo/framework";

import { app } from "./app";
import { routes, templates } from "./routes.gen";

type TemplateId = keyof typeof templates;

function isTemplateId(id: string): id is TemplateId {
	return id in templates;
}

function loadTemplate(id: string) {
	if (!isTemplateId(id)) {
		return Promise.reject(new Error(`Unknown template: ${id}`));
	}
	return templates[id]().then((m) => m.default);
}

const handler = createRequestHandler({
	app,
	getRoutes: () => routes,
	loadRouteModule: (route) => route.load(),
	loadTemplate,
});

export default handler;
