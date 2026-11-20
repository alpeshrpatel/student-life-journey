/** Layer rules from docs/plan/03_ARCHITECTURE.md §6.1. Every rule is an error: do not weaken one to pass. */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "domain-is-pure",
      severity: "error",
      from: { path: "^packages/domain/src" },
      to: { pathNot: ["^packages/domain/src", "/node_modules/zod/"] },
    },
    {
      name: "contracts-edges",
      severity: "error",
      from: { path: "^packages/contracts/src" },
      to: { pathNot: ["^packages/(contracts|domain)/src", "/node_modules/zod/"] },
    },
    {
      name: "ai-is-portable",
      severity: "error",
      from: { path: "^packages/ai" },
      to: {
        path: [
          "^apps/",
          "/node_modules/hono/",
          "/node_modules/@hono/",
          "/node_modules/drizzle-orm/",
          "/node_modules/better-auth/",
        ],
      },
    },
    {
      name: "client-edges",
      severity: "error",
      from: { path: "^packages/api-client/src" },
      to: { pathNot: ["^packages/(api-client|contracts)/src", "/node_modules/zod/"] },
    },
    {
      name: "modules-are-pure",
      severity: "error",
      from: { path: "^apps/api/src/modules" },
      to: {
        path: [
          "^apps/api/src/(infra|http|composition)",
          "/node_modules/hono/",
          "/node_modules/@hono/",
          "/node_modules/drizzle-orm/",
          "/node_modules/better-auth/",
        ],
      },
    },
    {
      name: "http-uses-container",
      severity: "error",
      from: { path: "^apps/api/src/http" },
      to: { path: "^apps/api/src/infra" },
    },
    {
      name: "no-cross-module-repositories",
      severity: "error",
      comment: "Modules use ports, never the concrete repositories.",
      from: { path: "^apps/api/src/modules/([^/]+)/" },
      to: { path: "^apps/api/src/infra/db/repositories" },
    },
    {
      name: "web-no-server",
      severity: "error",
      from: { path: "^apps/web/src" },
      to: { path: ["^apps/api", "^packages/ai"] },
    },
    {
      name: "screens-use-hooks",
      severity: "error",
      from: { path: "^apps/web/src/(screens|ui)" },
      to: { path: ["^packages/api-client", "/node_modules/@capacitor/"] },
    },
    {
      name: "no-legacy",
      severity: "error",
      from: {},
      to: { path: "^legacy/" },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.base.json" },
    tsPreCompilationDeps: true,
    doNotFollow: { path: "node_modules" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
    },
    exclude: { path: "(\\.test\\.|/test/|/e2e/|/dist/|/\\.wrangler/)" },
  },
};
