// src/routes.gen.ts (generated — do not edit)
export const routes = [
  { routePath: "/", params: [], loadModule: () => import("./routes/index") },
  { routePath: "/api/echo", params: [], loadModule: () => import("./routes/api/echo") },
  { routePath: "/api/health", params: [], loadModule: () => import("./routes/api/health") },
  { routePath: "/async-loader", params: [], loadModule: () => import("./routes/async-loader") },
  { routePath: "/blog/featured", params: [], loadModule: () => import("./routes/blog/featured") },
  { routePath: "/context-test", params: [], loadModule: () => import("./routes/context-test") },
  { routePath: "/demo", params: [], loadModule: () => import("./routes/demo") },
  { routePath: "/error-test", params: [], loadModule: () => import("./routes/error-test") },
  { routePath: "/meta-dynamic", params: [], loadModule: () => import("./routes/meta-dynamic") },
  { routePath: "/meta-static", params: [], loadModule: () => import("./routes/meta-static") },
  { routePath: "/partial-slots", params: [], loadModule: () => import("./routes/partial-slots") },
  { routePath: "/redirect-test", params: [], loadModule: () => import("./routes/redirect-test") },
  { routePath: "/request-test", params: [], loadModule: () => import("./routes/request-test") },
  { routePath: "/throw-test", params: [], loadModule: () => import("./routes/throw-test") },
  { routePath: "/typo-slot", params: [], loadModule: () => import("./routes/typo-slot") },
  { routePath: "/blog/:slug", params: ["slug"], loadModule: () => import("./routes/blog/[slug]") },
  { routePath: "/users/:id/posts/:postId", params: ["id", "postId"], loadModule: () => import("./routes/users/[id]/posts/[postId]") },
];

export const templates = {
  default: () => import("./templates/default"),
};

export const errorPages = {
  404: () => import("./routes/404"),
  500: () => import("./routes/500"),
};

export const hydrationManifest = {
  "/404": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/500": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/async-loader": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/context-test": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/demo": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/meta-dynamic": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/meta-static": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/partial-slots": {
    "header": false
  },
  "/request-test": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/throw-test": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/typo-slot": {
    "headr": false,
    "main": false,
    "footer": false
  },
  "/blog/[slug]": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/blog/featured": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/users/[id]/posts/[postId]": {
    "header": false,
    "main": false,
    "footer": false
  }
};
