// src/routes.gen.ts (generated — do not edit)
export const routes = [
  { routePath: "/", params: [], loadModule: () => import("./routes/index") },
  { routePath: "/api/echo", params: [], loadModule: () => import("./routes/api/echo") },
  { routePath: "/api/health", params: [], loadModule: () => import("./routes/api/health") },
  { routePath: "/app-context", params: [], loadModule: () => import("./routes/(features)/app-context") },
  { routePath: "/async-data", params: [], loadModule: () => import("./routes/(features)/async-data") },
  { routePath: "/blog/featured", params: [], loadModule: () => import("./routes/blog/featured") },
  { routePath: "/counter", params: [], loadModule: () => import("./routes/(features)/counter") },
  { routePath: "/full-hydration", params: [], loadModule: () => import("./routes/(features)/full-hydration") },
  { routePath: "/meta-dynamic", params: [], loadModule: () => import("./routes/(features)/meta-dynamic") },
  { routePath: "/meta-static", params: [], loadModule: () => import("./routes/(features)/meta-static") },
  { routePath: "/minimal-template", params: [], loadModule: () => import("./routes/(features)/minimal-template") },
  { routePath: "/partial-slots", params: [], loadModule: () => import("./routes/(features)/partial-slots") },
  { routePath: "/pricing", params: [], loadModule: () => import("./routes/(marketing)/pricing") },
  { routePath: "/request-data", params: [], loadModule: () => import("./routes/(features)/request-data") },
  { routePath: "/trigger-403", params: [], loadModule: () => import("./routes/(test)/trigger-403") },
  { routePath: "/trigger-404", params: [], loadModule: () => import("./routes/(test)/trigger-404") },
  { routePath: "/trigger-500", params: [], loadModule: () => import("./routes/(test)/trigger-500") },
  { routePath: "/trigger-redirect", params: [], loadModule: () => import("./routes/(test)/trigger-redirect") },
  { routePath: "/typo-slot", params: [], loadModule: () => import("./routes/(test)/typo-slot") },
  { routePath: "/blog/:slug", params: ["slug"], loadModule: () => import("./routes/blog/[slug]") },
  { routePath: "/users/:id/posts/:postId", params: ["id", "postId"], loadModule: () => import("./routes/users/[id]/posts/[postId]") },
  { routePath: "/docs/*slug", params: ["slug"], loadModule: () => import("./routes/docs/[...slug]") },
];

export const templates = {
  default: () => import("./templates/default"),
  minimal: () => import("./templates/minimal"),
};

export const errorPages = {
  403: () => import("./routes/403"),
  404: () => import("./routes/404"),
  500: () => import("./routes/500"),
};

export const hydrationManifest = {
  "/403": {
    "header": false,
    "main": false,
    "footer": false
  },
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
  "/": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/app-context": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/async-data": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/counter": {
    "header": false,
    "main": true,
    "footer": false
  },
  "/full-hydration": {
    "header": true,
    "main": true,
    "footer": true
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
  "/minimal-template": {
    "content": false
  },
  "/partial-slots": {
    "header": false
  },
  "/request-data": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/pricing": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/trigger-500": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/typo-slot": {
    "headr": false,
    "main": false,
    "footer": false
  },
  "/blog/:slug": {
    "header": false,
    "main": true,
    "footer": false
  },
  "/blog/featured": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/docs/*slug": {
    "header": false,
    "main": false,
    "footer": false
  },
  "/users/:id/posts/:postId": {
    "header": false,
    "main": false,
    "footer": false
  }
};
