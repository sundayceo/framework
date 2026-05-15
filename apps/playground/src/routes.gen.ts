// src/routes.gen.ts (generated — do not edit)
export const routes = [
  { pattern: "/", params: [], load: () => import("./routes/index.tsx") },
  { pattern: "/404", params: [], load: () => import("./routes/404.tsx") },
  { pattern: "/500", params: [], load: () => import("./routes/500.tsx") },
  { pattern: "/api/health", params: [], load: () => import("./routes/api/health.tsx") },
  { pattern: "/demo", params: [], load: () => import("./routes/demo.tsx") },
  { pattern: "/error-test", params: [], load: () => import("./routes/error-test.tsx") },
  { pattern: "/redirect-test", params: [], load: () => import("./routes/redirect-test.tsx") },
];

export const templates = {
  default: () => import("./templates/default.tsx"),
};
