import dotenv from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

dotenv.config();

const DB_CLIENT_URLS = [
  process.env.DEV_DATABASE_URL,
  process.env.DEV_DATABASE_URL2,
  process.env.DEV_DATABASE_URL3,
].filter((url) => url !== undefined);

async function migrateDatabases(): Promise<void> {
  for (const url of DB_CLIENT_URLS) {
    try {
      const pool = new Pool({
        connectionString: url,
      });

      const db = drizzle(pool);

      await migrate(db, {
        migrationsFolder: "drizzle",
      });

      console.info(`Finished migrating ${url}`);
    } catch (error) {
      console.error(error);
      console.error(
        `Error migrating to DB (${url}): error=${JSON.stringify(error)}`
      );
      return;
    }
  }
}

migrateDatabases()
  .then(() => {
    console.info("All migrations complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration process failed:", err);
  });
