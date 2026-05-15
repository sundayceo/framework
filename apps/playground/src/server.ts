import { createHandler } from "@sundayceo/framework";

import { app } from "./app";
import { routes, templates } from "./routes.gen";

export default createHandler({ app, routes, templates });
