import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

const searchAPI = createFromSource(source);

export const { GET } = searchAPI;
