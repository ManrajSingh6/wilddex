import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.SOCKET_SERVER_PORT || 4001;

httpServer.listen(PORT, () => {
  console.log(`Socket server is running on port ${PORT}`);
});
