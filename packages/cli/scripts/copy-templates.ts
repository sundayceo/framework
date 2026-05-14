import { cpSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(currentDir, "../../..");
const src = resolve(root, "templates");
const dest = resolve(currentDir, "../dist/templates");

cpSync(src, dest, { recursive: true });
