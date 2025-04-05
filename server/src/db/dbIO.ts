import { PgTable, pgTable } from "drizzle-orm/pg-core";
import { activeDBs } from "../index";
import {
  and,
  Column,
  eq,
  InferInsertModel,
  InferSelectModel,
} from "drizzle-orm";

export async function writeToDatabases<T extends PgTable>(
  dbTable: T,
  dbInsert: InferInsertModel<T>
) {
  return await Promise.all(
    activeDBs.map(async (client) => {
      const insertSuccess = await client
        .insert(dbTable)
        .values(dbInsert)
        .returning();

      if (!insertSuccess || insertSuccess.length === 0) {
        return undefined;
      }

      const insertedRow = insertSuccess[0];

      return insertedRow as InferSelectModel<T>;
    })
  );
}

export async function readFromDatabases<T extends PgTable>(
  dbTable: T,
  condition?: Partial<InferSelectModel<T>>
): Promise<InferSelectModel<T>[] | undefined> {
  // If no condition is provided, return all rows
  if (!condition) {
    for (const client of activeDBs) {
      const res = await client.select().from(dbTable as any);
      if (res && res.length > 0) {
        return res as InferSelectModel<T>[];
      }
    }
    return undefined;
  }

  // Create a type alias that extracts keys corresponding to columns.
  type ColumnKey = {
    [K in keyof T]: T[K] extends Column<any, any, any> ? K : never;
  }[keyof T];

  // Build filter conditions from the condition object.
  const filters = Object.entries(condition).map(([key, value]) => {
    // Tell TypeScript that this key is one of the column keys.
    const columnKey = key as ColumnKey;
    // Assert that the value at dbTable[columnKey] is indeed a Column.
    const column = dbTable[columnKey] as unknown as Column<any, any, any>;
    return eq(column, value);
  });

  // Use the combined filters in your query.
  for (const client of activeDBs) {
    const res = await client
      .select()
      .from(dbTable as any)
      .where(and(...filters));
    if (res && res.length > 0) {
      return res as InferSelectModel<T>[];
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
      } else if (res && typeof res === "object" && "rows" in res) {
        resultArray = res.rows;
      } else {
        resultArray = [];
      }

      // Return the rows if any were deleted; otherwise undefined.
      return resultArray.length > 0
        ? (resultArray as InferSelectModel<T>[])
        : undefined;
    })
  );
}
