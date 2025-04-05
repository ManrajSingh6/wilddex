import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"

const DB_CLIENT_URLS = [
    process.env.DATABASE_URL,//postgres:wilddex@db-primary:5432/wilddex-primary-db
    process.env.REPLICA_DATABASE_URL,//postgres:wilddex@db-replica:5433/wilddex-replica-db
    process.env.REPLICA2_DATABASE_URL//postgres:wilddex@db-replica2:5434/wilddex-replica2-db
].filter((url) => url !== undefined)

async function migrateDatabases(): Promise<void> {
    for (const url of DB_CLIENT_URLS) {
        try {
            const pool = new Pool({
                connectionString: url
            })

            const db = drizzle(pool)

            await migrate(db, {
                migrationsFolder: '../../drizzle'
            })

            console.log(`Finished migrating ${url}`)

        } catch (error) {
            console.error(`Error migrating to DB (${url}): error=${JSON.stringify(error)}`)
            return
        }
    }
}

migrateDatabases()
  .then(() => {
    console.log('🏁 All migrations complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Migration process failed:', err);
  });