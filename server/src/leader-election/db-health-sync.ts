import dotenv from "dotenv";
import { dbClient, replicaDbClient, replica2DbClient } from "../index";
import { addAbortSignal } from "stream";
import { float } from "drizzle-orm/mysql-core";

dotenv.config();

export async function databaseHealth(
  database: string
): Promise<boolean | undefined> {
  switch (database) {
    case "primary":
      try {
        await dbClient.execute("SELECT 1");
        console.info("(DATABASE) Primary is Alive");
        return true;
      } catch (error) {
        console.error("Primary is Dead", error);
        return false;
      }

    case "replica":
      try {
        await replicaDbClient.execute("SELECT 1");
        console.info("(DATABASE) Replica is Alive");
        return true;
      } catch (error) {
        console.error("Replica is Dead", error);
        return false;
      }

    case "replica2":
      try {
        await replica2DbClient.execute("SELECT 1");
        console.info("(DATABASE) Replica2 is Alive");
        return true;
      } catch (error) {
        console.error("Replica2 is Dead", error);
        return false;
      }

    default:
      console.error(`Database type ${database} does not exist`);
      return undefined;
  }
}
