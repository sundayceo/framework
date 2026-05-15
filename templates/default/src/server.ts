import { cloudflare } from "@sundayceo/framework/cloudflare";

import { app } from "./app";
import { routes, templates } from "./routes.gen";

export default cloudflare({
	app,
	getRoutes: () => routes,
	loadRouteModule: (route) => route.load(),
	loadTemplate: (id) => templates[id]().then((m) => m.default),
});
