import { dbClient, replica2DbClient, replicaDbClient } from "../index";
import { upvotesTable, badgesTable, postsTable, usersTable } from "./schema";

export async function syncAllPrimaryData(): Promise<undefined> {
    let schema = [upvotesTable, badgesTable, postsTable, usersTable];

    try {
        console.log("Starting full sync from primary to replicas...\n");

        for (const [tableName, table] of Object.entries(schema)) {
            console.log(`Fetching data from primary: ${tableName}`);
            const data = await dbClient.select().from(table);

            console.log(`Clearing data in replica 1: ${tableName}`);
            await replicaDbClient.delete(table);

            console.log(`Inserting into replica 1: ${tableName}`);
            if (data.length > 0) {
                await replicaDbClient.insert(table).values(data);
            }

            console.log(`Clearing data in replica 2: ${tableName}`);
            await replica2DbClient.delete(table);

            console.log(`Inserting into replica 2: ${tableName}`);
            if (data.length > 0) {
                await replica2DbClient.insert(table).values(data);
            }

            console.log(`Synced table: ${tableName}\n`);
        }

        console.log("Database sync complete.");
    } catch (error) {
        console.error("Error during DB synchronization:", error);
    }
}