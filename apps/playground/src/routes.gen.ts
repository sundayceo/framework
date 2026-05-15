// src/routes.gen.ts (generated — do not edit)
export const routes = [
  { pattern: "/", params: [], load: () => import("./routes/index") },
  { pattern: "/api/health", params: [], load: () => import("./routes/api/health") },
  { pattern: "/demo", params: [], load: () => import("./routes/demo") },
  { pattern: "/error-test", params: [], load: () => import("./routes/error-test") },
  { pattern: "/redirect-test", params: [], load: () => import("./routes/redirect-test") },
];

export const templates = {
  default: () => import("./templates/default"),
};

export const errorPages = {
  404: () => import("./routes/404"),
  500: () => import("./routes/500"),
};
