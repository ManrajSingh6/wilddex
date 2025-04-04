import { PgTable, pgTable } from "drizzle-orm/pg-core";
import { dbClient, replicaDbClient, replica2DbClient } from "../index";
import { InferInsertModel } from "drizzle-orm";

export async function writeToDatabases<T extends PgTable>(
    dbTable: T,
    dbInsert: InferInsertModel<T>
  ) {
    return await Promise.all(
      [dbClient, replicaDbClient, replica2DbClient].map(async (client) => {
        const insertSuccess = await client.insert(dbTable).values(dbInsert).returning();
  
        if (insertSuccess === undefined) {
          return undefined;
        }
        return insertSuccess[0];
      })
    );
  }