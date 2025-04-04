import { dbClient, replica2DbClient, replicaDbClient } from "../index";
import { upvotesTable, badgesTable, postsTable, usersTable } from "./schema";

export async function syncAllData(src: typeof dbClient, target: typeof dbClient): Promise<undefined> {
    let schema = [upvotesTable, badgesTable, postsTable, usersTable];

    try {
        console.log("Starting full sync...\n");

        for (const [tableName, table] of Object.entries(schema)) {
            console.log(`Fetching data from src: ${tableName}`);
            const data = await src.select().from(table);

            console.log(`Clearing data in target: ${tableName}`);
            await target.delete(table);

            console.log(`Inserting into target: ${tableName}`);
            if (data.length > 0) {
                await target.insert(table).values(data);
            }
            console.log(`Synced table: ${tableName}\n`);
        }

        console.log("Database sync complete.");
    } catch (error) {
        console.error("Error during DB synchronization:", error);
    }
}