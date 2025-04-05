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

export async function readFromDatabases<T extends PgTable>(
  dbTable: T,
  condition: Partial<InferSelectModel<T>>
): Promise<(any | undefined)> {
  for (const client of activeDBs) {
    const res = await client
      .select()
      .from(dbTable as any)
      .where(condition as any);

    if (res && res.length > 0) {
      return res;
    }
  }
  return undefined;
}

export async function deleteFromDatabases<T extends PgTable>(
  dbTable: T,
  condition: Partial<InferSelectModel<T>>
): Promise<(InferSelectModel<T>[] | undefined)[]> {
  return await Promise.all(
    activeDBs.map(async (db) => {
      // Execute the delete query and capture the result.
      const res: any = await db
        .delete(dbTable as any)
        .where(condition as any)
        .returning();

      // Determine if 'res' is an array or a QueryResult with rows.
      let resultArray: any[];
      if (Array.isArray(res)) {
        resultArray = res;
      } else if (res && typeof res === 'object' && 'rows' in res) {
        resultArray = res.rows;
      } else {
        resultArray = [];
      }

      // Return the rows if any were deleted; otherwise undefined.
      return resultArray.length > 0 ? (resultArray as InferSelectModel<T>[]) : undefined;
    })
  );
}
