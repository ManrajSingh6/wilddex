import { PgTable, pgTable } from "drizzle-orm/pg-core";
import { dbClient, replicaDbClient, replica2DbClient, activeDBs } from "../index";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export async function writeToDatabases<T extends PgTable>(
  dbTable: T,
  dbInsert: InferInsertModel<T>
) {
  return await Promise.all(
    activeDBs.map(async (client) => {
      const insertSuccess = await client.insert(dbTable).values(dbInsert).returning();

      if (!insertSuccess || insertSuccess.length === 0) {
        return undefined
      }

      const insertedRow = insertSuccess[0]

      return insertedRow as InferSelectModel<T>
    })
  );
}