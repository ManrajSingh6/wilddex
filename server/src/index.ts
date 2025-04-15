import dotenv from "dotenv";
import express from "express";
import { router } from "./routes/router";
import { getFormattedApiResponse, HTTP_CODES } from "./utils/constants";
import { createDbClient } from "./db/db";
import { authenticateToken } from "./middleware/authMiddleware";
import { CronJob } from "cron";
import {
  electionMsg,
  leaderMsg,
  healthMsg,
  manageDatabaseCluster,
  syncDBsNormally,
  leaderElection,
} from "./leader-election/leaderElection";
import { WebSocket } from "ws";

dotenv.config();

const app = express();
const port = process.env.PORT || -1;

export const dbClient = createDbClient(process.env.DATABASE_URL ?? "");
export const replicaDbClient = createDbClient(
  process.env.REPLICA_DATABASE_URL ?? ""
);
export const replica2DbClient = createDbClient(
  process.env.REPLICA2_DATABASE_URL ?? ""
);

type dbClientType = typeof dbClient;

export let downDBs: dbClientType[] = [];
export let activeDBs: dbClientType[] = [
  dbClient,
  replica2DbClient,
  replicaDbClient,
];

app.use(express.json({ limit: "50mb" }));

app.use(authenticateToken);

app.use("/api", router);

app.get("/api/health", (_req, res) => {
  res.status(HTTP_CODES.OK).json(
    getFormattedApiResponse({
      message: "Server is running!",
      code: HTTP_CODES.OK,
    })
  );
});

const server = app.listen(port, () => {
  console.info(`🐢 Server running at: http://localhost:${port}`);
});
const wsServer = new WebSocket.Server({ server: server });

wsServer.on("connection", (ws: WebSocket) => {
  ws.on("message", async (message: string) => {
    const data = JSON.parse(message);
    if (data.type === "election") {
      electionMsg(data.port, ws);
    }

    if (data.type === "leader") {
      leaderMsg(data.leader, ws);
    }

    if (data.type === "health") {
      healthMsg(ws);
    }
  });
});

new CronJob(
  "*/15 * * * * *", // every 10 seconds
  async () => {
    // Wrap manageDatabaseCluster in an async function
    await leaderElection();
    await manageDatabaseCluster();
    await syncDBsNormally();
  }, // onTick
  null, // onComplete
  true, // start
  "America/Los_Angeles" // timeZone
);

(async () => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
    console.info("(DB JOB) Running manageDatabaseCluster on cold start...");
    await manageDatabaseCluster();
  } catch (error) {
    console.error(
      "(DB JOB) Error running manageDatabaseCluster on cold start:",
      error
    );
  }
})();

export function setActiveDbs(dbs: dbClientType[]) {
  activeDBs = dbs;
}

export function setDownDbs(dbs: dbClientType[]) {
  downDBs = dbs;
}
