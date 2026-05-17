// src/routes.gen.ts (generated — do not edit)
export const routes = [
  { pattern: "/", params: [], load: () => import("./routes/index") },
  { pattern: "/api/echo", params: [], load: () => import("./routes/api/echo") },
  { pattern: "/api/health", params: [], load: () => import("./routes/api/health") },
  { pattern: "/async-loader", params: [], load: () => import("./routes/async-loader") },
  { pattern: "/blog/featured", params: [], load: () => import("./routes/blog/featured") },
  { pattern: "/context-test", params: [], load: () => import("./routes/context-test") },
  { pattern: "/demo", params: [], load: () => import("./routes/demo") },
  { pattern: "/error-test", params: [], load: () => import("./routes/error-test") },
  { pattern: "/meta-dynamic", params: [], load: () => import("./routes/meta-dynamic") },
  { pattern: "/meta-static", params: [], load: () => import("./routes/meta-static") },
  { pattern: "/partial-slots", params: [], load: () => import("./routes/partial-slots") },
  { pattern: "/redirect-test", params: [], load: () => import("./routes/redirect-test") },
  { pattern: "/request-test", params: [], load: () => import("./routes/request-test") },
  { pattern: "/throw-test", params: [], load: () => import("./routes/throw-test") },
  { pattern: "/typo-slot", params: [], load: () => import("./routes/typo-slot") },
  { pattern: "/blog/:slug", params: ["slug"], load: () => import("./routes/blog/[slug]") },
  { pattern: "/users/:id/posts/:postId", params: ["id", "postId"], load: () => import("./routes/users/[id]/posts/[postId]") },
];

export const templates = {
  default: () => import("./templates/default"),
};

export const errorPages = {
  404: () => import("./routes/404"),
  500: () => import("./routes/500"),
};
