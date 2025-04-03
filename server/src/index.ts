import dotenv from "dotenv";
import express from "express";
import { router } from "./routes/router";
import { Server } from "socket.io";
import { getFormattedApiResponse, HTTP_CODES } from "./utils/constants";
import { createDbClient } from "./db/db";
import {
  AuthenticatedSocket,
  authenticateSocketToken,
  authenticateToken,
} from "./middleware/authMiddleware";
import { CronJob } from "cron";
import {
  electionMsg,
  leaderMsg,
  healthMsg,
  manageDatabaseCluster,
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
  console.log(`🐢 Server running at: http://localhost:${port}`);
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
    ws.close();
  });

  ws.on("close", () => console.log("Client disconnected"));
});

export const io = new Server(server);

io.use(authenticateSocketToken);

io.on("connection", (socket: AuthenticatedSocket) => {
  const userId = socket.user?.id;
  console.log("New Client Connected with ID: ", userId);

  if (!userId) {
    socket.disconnect();
    return;
  }

  socket.join(userId.toString());

  socket.on("disconnect", () => {
    console.log("Client Disconnected with ID: ", userId);
  });
});

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

const job = new CronJob(
  "* * * * *", // cronTime every minute
  async () => {
    // Wrap manageDatabaseCluster in an async function
    await manageDatabaseCluster(false);
  }, // onTick
  null, // onComplete
  true, // start
  "America/Los_Angeles" // timeZone
);
(async () => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
    console.log("🔄 Running manageDatabaseCluster on cold start...");
    await manageDatabaseCluster(true);
  } catch (error) {
    console.error("❌ Error running manageDatabaseCluster on startup:", error);
  }
})();
