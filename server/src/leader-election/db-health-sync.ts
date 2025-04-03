import dotenv from "dotenv";
import { dbClient, replicaDbClient, replica2DbClient } from "../index";
import { addAbortSignal } from "stream";
import { float } from "drizzle-orm/mysql-core";

dotenv.config();

export async function databaseHealth(database: string): Promise<Boolean | undefined> {

    switch (database) {
        case ("primary"):
            try {
                dbClient.execute("SELECT 1");
                console.log("Primary is Alive");
                return true;
            }
            catch {
                console.error("Primary is Dead");
                return false;
            }

        case ("replica"):
            try {
                replicaDbClient.execute("SELECT 1");
                console.log("Replica is Alive");
                return true;
            }
            catch {
                console.error("Replica is Dead");
                return false;
            }
        case ("replica2"):
            try {
                replica2DbClient.execute("SELECT 1");
                console.log("Replica2 is Alive");
                return true;
            }
            catch {
                console.error("Replica2 is Dead");
                return false;
            }
        default:
            console.error(`Database type ${database} does not exist`);
            return undefined;
    }

}