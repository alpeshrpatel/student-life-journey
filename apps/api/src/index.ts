import { buildApp } from "./app.js";

const app = buildApp();

export default { fetch: app.fetch };
