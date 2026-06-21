import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  driver: "expo",
  schema: "./services/offline/schema.ts",
  out: "./services/offline/drizzle",
});
