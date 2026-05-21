import { docs } from "collections/server";
import { loader } from "fumadocs-core/source";

import { resolveIcon } from "./icons";

export const source = loader({
	baseUrl: "/docs",
	icon: resolveIcon,
	source: docs.toFumadocsSource(),
});
