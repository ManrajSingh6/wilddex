import dotenv from "dotenv";
import { databaseHealth } from "./db-health-sync";
import { WebSocket } from "ws";
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
import { redisClient } from "./redis";

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
        `(LE) Cant find wsURL from peerport mapping, PORT : ${leaderPort}`
      );
      return;
    }
    const ws = new WebSocket(wsURL);
    let responded = false;

    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "health" }));
    });

    ws.on("message", (msg: string) => {
      const data = JSON.parse(msg);
      if (data.type === "ok") {
        console.log(`(LE) PORT ${PORT}: Leader PORT ${leaderPort} is alive!`);
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
  console.log(`(LE) Node ${PORT} initiating election...`);
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
      console.log(`(LE) PORT: ${PORT} send election msg to ${peerPort}`);
      ws.on("open", () => {
        ws.send(JSON.stringify({ type: "election", port: PORT }));
      });
      ws.on("message", (msg: string) => {
        const data = JSON.parse(msg);
        if (data.type === "bullied") {
          console.log(`(LE) PORT: ${PORT} got bullied by ${peerPort}`);
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
  console.log(`(LE) Node ${PORT} is the new leader!`);
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
  isLeader = PORT === leaderPort;
  console.log(`(LE) Current Leader: ${leaderPort}`);
  if (!leaderPort || (leaderPort < PORT && !running)) {
    initiateElection();
  } else if (!isLeader) {
    const failed = await failureDetector(leaderPort);
    if (failed) {
      console.log(`(LE) Leader ${leaderPort} failed. Starting election.`);
      initiateElection();
    }
  }
}

export function electionMsg(port: number, ws: WebSocket) {
  console.log(`(LE) Node ${PORT} received election message from ${port}`);
  ws.send(JSON.stringify({ type: "bullied" }));
  if (!running) initiateElection();
}

export function leaderMsg(leader: number, ws: WebSocket) {
  console.log(`(LE) Node ${PORT} acknowledges new leader: ${leader}`);
  isLeader = false;
  leaderPort = leader;
}

export function healthMsg(ws: WebSocket) {
  ws.send(JSON.stringify({ type: "ok" }));
}

export async function leaderElection() {
  leaderPort = await getLeaderFromRedis();
  checkLeader(leaderPort);
}

export async function manageDatabaseCluster() {
  if (isLeader) {
    console.info("(MANAGE DB CLUSTER) Database Health Checkup (By Leader)...");

    const dbPrimaryHealth = await databaseHealth("primary");
    const dbReplicaHealth = await databaseHealth("replica");
    const dbReplica2Health = await databaseHealth("replica2");

    if (dbPrimaryHealth !== undefined) isPrimaryDBAlive = dbPrimaryHealth;
    if (dbReplicaHealth !== undefined) isReplicaDBAlive = dbReplicaHealth;
    if (dbReplica2Health !== undefined) isReplica2DBAlive = dbReplica2Health;

    if (isPrimaryDBAlive) {
      console.info("(MANAGE DB CLUSTER) DB1 is alive");
      //see if it came back alive after being down
      if (downDBs.includes(dbClient)) {
        console.info(
          "(MANAGE DB CLUSTER) DB1 just came back alive again - syncing all data..."
        );

        syncAllData(activeDBs[0], dbClient);
        activeDBs.push(dbClient);

        const filteredDownDbs = downDBs.filter((ddb) => ddb !== dbClient);
        setDownDbs(filteredDownDbs);
      }
    } else {
      console.info("(MANAGE DB CLUSTER) DB1 is down");
      if (!downDBs.includes(dbClient)) {
        console.info("(MANAGE DB CLUSTER) Removing DB1 form active DB group");
        downDBs.push(dbClient);

        const filteredActiveDBs = activeDBs.filter((adb) => adb !== dbClient);
        setActiveDbs(filteredActiveDBs);
      }
    }
    if (isReplicaDBAlive) {
      console.info("(MANAGE DB CLUSTER) DB2 is alive");
      //see if it came back alive after being down
      if (downDBs.includes(replicaDbClient)) {
        console.info(
          "(MANAGE DB CLUSTER) DB2 just came back alive again - syncing all data..."
        );

        syncAllData(activeDBs[0], replicaDbClient);
        activeDBs.push(replicaDbClient);
        const filteredDownDbs = downDBs.filter(
          (ddb) => ddb !== replicaDbClient
        );
        setDownDbs(filteredDownDbs);
      }
    } else {
      console.info("(MANAGE DB CLUSTER) DB2 is down");
      if (!downDBs.includes(replicaDbClient)) {
        console.info("(MANAGE DB CLUSTER) Removing DB1 form active DB group");
        downDBs.push(replicaDbClient);
        const filteredActiveDBs = activeDBs.filter(
          (adb) => adb !== replicaDbClient
        );
        setActiveDbs(filteredActiveDBs);
      }
    }
    if (isReplica2DBAlive) {
      console.info("(MANAGE DB CLUSTER) DB3 is alive");
      //see if it came back alive after being down
      if (downDBs.includes(replica2DbClient)) {
        console.info(
          "(MANAGE DB CLUSTER) DB3 just came back alive again - syncing all data..."
        );

        syncAllData(activeDBs[0], replica2DbClient);
        activeDBs.push(replica2DbClient);
        const filteredDownDbs = downDBs.filter(
          (ddb) => ddb !== replica2DbClient
        );
        setDownDbs(filteredDownDbs);
      }
    } else {
      console.info("(MANAGE DB CLUSTER) DB3 is down");
      if (!downDBs.includes(replica2DbClient)) {
        console.info("(MANAGE DB CLUSTER) Removing DB3 form active DB group");
        downDBs.push(replica2DbClient);
        const filteredActiveDBs = activeDBs.filter(
          (adb) => adb !== replica2DbClient
        );
        setActiveDbs(filteredActiveDBs);
      }
    }

    console.info(
      "(MANAGE DB CLUSTER) Database Health Checkup (By Leader)... Finished"
    );
  }
}

export async function syncDBsNormally() {
  if (isLeader) {
    console.info("(DB SYNC) Leader Performing Sync...");

    console.info("(DB_SYNC) ACTIVE DBS : ", activeDBs.length);
    if (activeDBs.length > 1) {
      console.info("(DB SYNC) Performing Database Sync Active DBs...");

      checkDataDBs(activeDBs[0], activeDBs[1]);

      if (activeDBs.length > 2) checkDataDBs(activeDBs[0], activeDBs[2]);
    }
  }
}
