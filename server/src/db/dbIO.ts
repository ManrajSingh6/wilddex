import { PgTable } from "drizzle-orm/pg-core";
import { activeDBs } from "../index";
import {
  and,
  Column,
  eq,
  InferInsertModel,
  InferSelectModel,
} from "drizzle-orm";
import { redlock } from "../leader-election/redis";
import { Lock } from "redlock";

const REDLOCK_KEY = "locks:databaseWrite";
const TTL = 10000; // 10 seconds

const REDLOCK_DELETE_KEY = "locks:databaseDelete";

export async function writeToDatabases<T extends PgTable>(
  dbTable: T,
  dbInsert: InferInsertModel<T>
) {
  let lock: Lock | undefined;

  console.info(`(SYNCH) Attempting to acquire distributed write lock`);

  try {
    lock = await redlock.acquire([REDLOCK_KEY], TTL);

    const results = await Promise.all(
      activeDBs.map(async (client) => {
        try {
          const insertSuccess = await client
            .insert(dbTable)
            .values(dbInsert)
            .returning();

          if (!insertSuccess || insertSuccess.length === 0) {
            return undefined;
          }

          const insertedRow = insertSuccess[0];

          return insertedRow as InferSelectModel<T>;
        } catch (error) {
          console.error(
            `Error writing to database ${client} for table ${dbTable}: ${error}`
          );
          return undefined;
        }
      })
    );

    return results;
  } catch (error) {
    console.error(`Error acquiring distributed write lock: ${error}`);
    return [];
  } finally {
    if (lock) {
      try {
        await lock.release();
      } catch (releaseError) {
        console.error(`Error releasing write lock: ${releaseError}`);
      }
    }
  }
}

export async function readFromDatabases<T extends PgTable>(
  dbTable: T,
  condition?: Partial<InferSelectModel<T>>
): Promise<InferSelectModel<T>[] | undefined> {
  // If no condition is provided, return all rows
  if (!condition) {
    for (const client of activeDBs) {
      try {
        const res = await client.select().from(dbTable as any);
        if (res) {
          return res as InferSelectModel<T>[];
        }
      } catch (error) {
        console.error(
          `Error reading from database ${client} for table ${dbTable}: ${error}`
        );
        continue;
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
    try {
      const res = await client
        .select()
        .from(dbTable as any)
        .where(and(...filters));

      if (res) {
        return res as InferSelectModel<T>[];
      }
    } catch (error) {
      console.error(
        `Didnt find anything in ${client} for ${dbTable}: ${error}`
      );
      continue;
    }
  }
  return undefined;
}

export async function deleteFromDatabases<T extends PgTable>(
  dbTable: T,
  condition: Partial<InferSelectModel<T>>
): Promise<(InferSelectModel<T>[] | undefined)[]> {
  let lock: Lock | undefined;

  // Build an array of conditions using eq for each key in the condition object.
  const filters = Object.entries(condition).map(([key, value]) => {
    // Cast the key to a key of dbTable.
    // Make sure that the key corresponds to a valid column.
    const column = dbTable[key as keyof T] as any;
    return eq(column, value);
  });

  // Combine the filters with 'and'
  const whereCondition = and(...filters);

  try {
    lock = await redlock.acquire([REDLOCK_DELETE_KEY], TTL);

    console.info(`(SYNCH) Attempting to acquire distributed delete lock`);

    const results = await Promise.all(
      activeDBs.map(async (db) => {
        // Execute the delete query with the built condition
        const res: any = await db
          .delete(dbTable as any)
          .where(whereCondition)
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

        return resultArray.length > 0
          ? (resultArray as InferSelectModel<T>[])
          : undefined;
      })
    );

    return results;
  } catch (error) {
    console.error(`Error acquiring distributed delete lock: ${error}`);
    return [];
  } finally {
    if (lock) {
      try {
        await lock.release();
      } catch (releaseError) {
        console.error(`Error releasing delete lock: ${releaseError}`);
      }
    }
  }
}
