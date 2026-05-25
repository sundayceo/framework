import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import { frameworkPlugin } from "@sundayceo/framework/vite";

export default defineConfig({
	plugins: [tailwindcss(), frameworkPlugin({ clientBase: "" })],
});
