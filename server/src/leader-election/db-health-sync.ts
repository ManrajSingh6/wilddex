import dotenv from "dotenv";
import { dbClient, replicaDbClient } from "../index";
import { addAbortSignal } from "stream";
import { float } from "drizzle-orm/mysql-core";

dotenv.config();

export async function databaseHealth(database: string) : Promise<Boolean| undefined>{
    
    switch(database)
    {
        case("primary"):
            try{
                dbClient.execute("SELECT 1");
                console.log("Primary is Alive");
                return true;
            }
            catch{
                console.error("Primary is Dead");
                return false;
            }

        case("replica"):
            try{
                dbClient.execute("SELECT 1");
                console.log("Replica is Alive");
                return true;
            }
            catch{
                console.error("Replica is Dead");
                return false;
            }
        default:
            console.error(`Database type ${database} does not exist`);
            return undefined;
    }

}