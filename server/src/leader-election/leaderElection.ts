import { createClient } from "redis";
import { databaseHealth } from "./db-health-sync";
import { WebSocket } from "ws";
import dotenv from "dotenv";

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
    const dbPrimaryHealth = await databaseHealth("primary");
    const dbReplicaHealth = await databaseHealth("replica");
    const dbReplica2Health = await databaseHealth("replica2");

    if (dbPrimaryHealth != undefined) isPrimaryDBAlive = dbPrimaryHealth;
    if (dbReplicaHealth != undefined) isReplicaDBAlive = dbReplicaHealth;
    if (dbReplica2Health != undefined) isReplica2DBAlive = dbReplica2Health;

    if (isPrimaryDBAlive && isReplicaDBAlive && isReplica2DBAlive) {
      try {
        console.log("Attempting to acquire DB sync lock...");

        const lockKey = "db-sync-lock";
        const ttl = 5000; // 5 seconds

        const lockAcquired = await acquireLock(lockKey, ttl);

        if (!lockAcquired) {
          console.log("Lock not acquired. Another process is already syncing.");
          return;
        }

        console.log("Lock acquired! Performing database sync...");

        // Perform database sync
        console.log("Trying to sync databases");

        console.log("Database sync completed. Releasing lock...");

        // Release lock
        await releaseLock(lockKey);
      } catch (error) {
        console.error("Failed to acquire lock or sync databases:", error);
      }
    }
  }
}
