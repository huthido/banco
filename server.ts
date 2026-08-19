import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { registerSocketHandlers, type AppServer } from "./src/lib/server/socket";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io: AppServer = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
  });

  registerSocketHandlers(io);

  httpServer.listen(port, () => {
    console.log(`> BànCờ ready on http://${hostname}:${port}`);
  });
});
