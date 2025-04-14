import { createClient } from "redis";
import { databaseHealth } from "./db-health-sync";
import { WebSocket } from "ws";
import dotenv from "dotenv";
import { syncAllData } from "../db/synchronisation";
import { checkDataDBs } from "../db/synchronisation";
import {
  activeDBs,
  dbClient,
  downDBs,
  replica2DbClient,
  replicaDbClient,
  setActiveDbs,
  setDownDbs,
} from "..";

dotenv.config();

const LEADER_KEY = "leader";
const PORT: number = parseInt(process.env.PORT || "4000");
const PEER_PORTS: number[] = [4000, 4001, 4002].filter((p) => p !== PORT);

export let isPrimaryDBAlive: Boolean = true;
export let isReplicaDBAlive: Boolean = true;
export let isReplica2DBAlive: Boolean = true;

const PEER_PORT_HOST_MAPPING = new Map<number, string>([
  [4000, "api-1"],
  [4001, "api-2"],
  [4002, "api-3"],
]);

export function getWebSocketUrl(port: number): string | undefined {
  const host = PEER_PORT_HOST_MAPPING.get(port);
  return host ? `ws://${host}:${port}` : undefined;
}

const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_HOST = "redis-cache";

console.log(`Connecting to Redis: redis://${REDIS_HOST}:${REDIS_PORT}`);
console.log(`PORT: ${PORT}`);

const redisClient = createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
});

async function acquireLock(key: string, ttl: number): Promise<boolean> {
  console.log("TRYING TO GET KEY");
  const result: string | null = await redisClient.set(key, "locked", {
    NX: true, // "NX" means set the key only if it does not already exist
    PX: ttl, // "PX" sets the expiration time in milliseconds
  });
  console.log(`RESULT: ${result}`);
  return result === "OK"; // Lock acquired successfully
}

async function releaseLock(key: string): Promise<boolean> {
  console.log("TRYING TO RELEASE KEY");

  // Use the DEL command to delete the key
  const result: number = await redisClient.del(key);

  console.log("RELEASED KEY");

  // If the result is 1, it means the key was deleted (lock released)
  return result === 1;
}
redisClient.on("error", (err) => console.error("Redis Client Error", err));
let clientConnected = false;

async function connectRedis(): Promise<Boolean | undefined> {
  try {
    if (!clientConnected) {
      await redisClient.connect();
      clientConnected = true;
    }
    return true;
  } catch (error) {
    console.error(`Connecting to Redis Error : ${error}`);
    return undefined;
  }
}

let isLeader = false;
let leaderPort: number | null = null;
let running = false;

async function getLeaderFromRedis(): Promise<number | null> {
  const leader = await redisClient.get(LEADER_KEY);
  return leader ? parseInt(leader) : null;
}

function failureDetector(leaderPort: number): Promise<boolean> {
  return new Promise((resolve) => {
    const wsURL = getWebSocketUrl(leaderPort);
    if (!wsURL) {
      console.error(
        `Cant find wsURL from peerport mapping, PORT : ${leaderPort}`
      );
      return;
    }
    const ws = new WebSocket(wsURL);
    // const ws = new WebSocket(`ws://localhost:${id}`);
    let responded = false;

    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "health" }));
    });

    ws.on("message", (msg: string) => {
      const data = JSON.parse(msg);
      if (data.type === "ok") {
        console.log(`PORT ${PORT}: Leader PORT ${leaderPort} is alive!`);
        responded = true;
        resolve(false);
      }
      ws.close();
    });

    ws.on("error", () => {
      resolve(true);
      ws.close();
    });
    ws.on("close", () => resolve(true));

    setTimeout(() => {
      if (!responded) resolve(true);
      ws.close();
    }, 2000);
  });
}

function initiateElection(): void {
  console.log(`Node ${PORT} initiating election...`);
  running = true;
  PEER_PORTS.forEach((peerPort) => {
    if (peerPort > PORT) {
      const wsURL = getWebSocketUrl(peerPort);
      if (!wsURL) {
        console.error(
          `Cant find wsURL from peerport mapping, PORT : ${peerPort}`
        );
        return;
      }
      const ws = new WebSocket(wsURL);
      console.log(`PORT : ${PORT} send election msg to ${peerPort}`);
      ws.on("open", () => {
        ws.send(JSON.stringify({ type: "election", port: PORT }));
      });
      ws.on("message", (msg: string) => {
        const data = JSON.parse(msg);
        console.log(data);
        if (data.type === "bullied") {
          console.log(`PORT: ${PORT} got bullied by ${peerPort}`);
          running = false;
        }
        ws.close();
      });
      ws.on("error", (error) => {
        console.log(error);
        ws.close();
      });
    }
  });

  setTimeout(() => {
    if (running) {
      declareLeadership();
      running = false;
    }
  }, 2000);
}

function declareLeadership(): void {
  isLeader = true;
  leaderPort = PORT;
  console.log(`Node ${PORT} is the new leader!`);
  redisClient.set(LEADER_KEY, PORT.toString());
  notifyPeers();
}

function notifyPeers(): void {
  PEER_PORTS.forEach((peerPort) => {
    const wsURL = getWebSocketUrl(peerPort);
    if (!wsURL) {
      console.error(
        `Cant find wsURL from peerport mapping, PORT : ${peerPort}`
      );
      return;
    }
    const ws = new WebSocket(wsURL);
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "leader", leader: PORT }));
      ws.close();
    });
    ws.on("error", () => ws.close());
  });
}

async function checkLeader(leaderPort: number | null): Promise<void> {
  isLeader = PORT == leaderPort;
  console.log(`Current Leader: ${leaderPort}`);
  if (!leaderPort || (leaderPort < PORT && !running)) {
    initiateElection();
  } else if (!isLeader) {
    const failed = await failureDetector(leaderPort);
    if (failed) {
      console.log(`Leader ${leaderPort} failed. Starting election.`);
      initiateElection();
    }
  }
}

export function electionMsg(port: number, ws: WebSocket) {
  console.log(`Node ${PORT} received election message from ${port}`);
  ws.send(JSON.stringify({ type: "bullied" }));
  if (!running) initiateElection();
}

export function leaderMsg(leader: number, ws: WebSocket) {
  console.log(`Node ${PORT} acknowledges new leader: ${leader}`);
  isLeader = false;
  leaderPort = leader;
}

export function healthMsg(ws: WebSocket) {
  ws.send(JSON.stringify({ type: "ok" }));
}

export async function leader_election() {
  const redisConnection = await connectRedis();
  if (redisConnection) {
    leaderPort = await getLeaderFromRedis();
    checkLeader(leaderPort);
  } else checkLeader(null);
}

export async function manageDatabaseCluster() {
  const LE = await leader_election();

  if (isLeader) {
    console.log(
      "Leader Checking the DBs health\nBefore Health Check the DBs looklike"
    );
    // console.log("Down DBs: ", downDBs);
    // console.log("Active DBs: ", activeDBs);

    const dbPrimaryHealth = await databaseHealth("primary");
    const dbReplicaHealth = await databaseHealth("replica");
    const dbReplica2Health = await databaseHealth("replica2");

    if (dbPrimaryHealth != undefined) isPrimaryDBAlive = dbPrimaryHealth;
    if (dbReplicaHealth != undefined) isReplicaDBAlive = dbReplicaHealth;
    if (dbReplica2Health != undefined) isReplica2DBAlive = dbReplica2Health;

    if (isPrimaryDBAlive) {
      console.log("DB1 is alive");
      //see if it came back alive after being down
      if (downDBs.includes(dbClient)) {
        console.log("DB1 just came back alive again\nsyncing all data...");

        syncAllData(activeDBs[0], dbClient);
        activeDBs.push(dbClient);

        const filteredDownDbs = downDBs.filter((ddb) => ddb !== dbClient);
        setDownDbs(filteredDownDbs);
      }
    } else {
      console.log("DB1 is down");
      if (!downDBs.includes(dbClient)) {
        console.log("Removing DB1 form active DB group");
        downDBs.push(dbClient);

        const filteredActiveDBs = activeDBs.filter((adb) => adb !== dbClient);
        setActiveDbs(filteredActiveDBs);
      }
    }
    if (isReplicaDBAlive) {
      console.log("DB2 is alive");
      //see if it came back alive after being down
      if (downDBs.includes(replicaDbClient)) {
        console.log("DB2 just came back alive again\nsyncing all data...");

        syncAllData(activeDBs[0], replicaDbClient);
        activeDBs.push(replicaDbClient);
        const filteredDownDbs = downDBs.filter(
          (ddb) => ddb !== replicaDbClient
        );
        setDownDbs(filteredDownDbs);
      }
    } else {
      console.log("DB2 is down");
      if (!downDBs.includes(replicaDbClient)) {
        console.log("Removing DB1 form active DB group");
        downDBs.push(replicaDbClient);
        const filteredActiveDBs = activeDBs.filter(
          (adb) => adb !== replicaDbClient
        );
        setActiveDbs(filteredActiveDBs);
      }
    }
    if (isReplica2DBAlive) {
      console.log("DB3 is alive");
      //see if it came back alive after being down
      if (downDBs.includes(replica2DbClient)) {
        console.log("DB3 just came back alive again\nsyncing all data...");

        syncAllData(activeDBs[0], replica2DbClient);
        activeDBs.push(replica2DbClient);
        const filteredDownDbs = downDBs.filter(
          (ddb) => ddb !== replica2DbClient
        );
        setDownDbs(filteredDownDbs);
      }
    } else {
      console.log("DB3 is down");
      if (!downDBs.includes(replica2DbClient)) {
        console.log("Removing DB3 form active DB group");
        downDBs.push(replica2DbClient);
        const filteredActiveDBs = activeDBs.filter(
          (adb) => adb !== replica2DbClient
        );
        setActiveDbs(filteredActiveDBs);
      }
    }

    console.log("The status of DBs after leader checkup:");
    // console.log("Down DBs: ", downDBs);
    // console.log("Active DBs: ", activeDBs);
  }
}


export async function syncDBsNormally() {
  const LE = await leader_election();

  if (isLeader) {
    console.log(
      "Leader Performing Sync"
    );

    if (activeDBs.length > 1){
      console.log("Performing Database sync on Active Dbs");
    
      checkDataDBs(activeDBs[0], activeDBs[1]);
      if (activeDBs.length >= 2) checkDataDBs(activeDBs[0], activeDBs[2]);
    }
  }
}