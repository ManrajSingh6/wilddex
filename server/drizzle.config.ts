import * as dotenv from "dotenv";
dotenv.config(); // Load the environment variables

import { defineConfig } from "drizzle-kit";

const dbUrl =
  process.env.DEV_DATABASE_URL ||
  process.env.DEV_DATABASE_URL2 ||
  process.env.DEV_DATABASE_URL3;

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl ?? "", // Default to an empty string if no URL is set
  },
  verbose: true,
  strict: true,
});
