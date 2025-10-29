import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { WSControlMessage } from "./types";


const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Map<string, WebSocket>();

const downloadsDir = path.join(process.cwd(), "downloads");
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

function sendControl(ws: WebSocket, msg: WSControlMessage) {
  ws.send(JSON.stringify(msg));
}

wss.on("connection", (ws, req) => {
  console.log("[server] New WS connection from", req.socket.remoteAddress);

  let id: string | null = null;
  let writeStream: fs.WriteStream | null = null;
  let expectedHash = "";
  let totalBytes = 0;
  let receivedBytes = 0;
  let filename = "";
  let hasher = crypto.createHash("sha256");

  ws.on("message", (data) => {
    const text = data.toString();
    try {
      const msg: WSControlMessage = JSON.parse(text);
      if (msg.type === "register") {
        id = msg.clientId!;
        clients.set(id, ws);
        console.log(`[server] Registered client ${id}`);
      } else if (msg.type === "hash") {
        expectedHash = msg.hash || "";
        console.log(`[server] Received expected hash from ${id}: ${expectedHash}`);
      } else if (msg.type === "start") {
        filename = msg.filename || "file.bin";
        const filepath = path.join(downloadsDir, `${id}_${Date.now()}_${filename}`);
        writeStream = fs.createWriteStream(filepath);
        totalBytes = msg.filesize || 0;
        console.log(`[server] Start receiving ${filename} from ${id} (${totalBytes} bytes)`);
      } else if (msg.type === "done") {
        if (writeStream) {
          writeStream.end(() => {
            const finalHash = hasher.digest("hex");
            console.log(`[server] Finished receiving from ${id}`);
            console.log(`[server] Final SHA256: ${finalHash}`);
            if (expectedHash === finalHash) {
              console.log(`[server] ✅ Hash verified successfully`);
            } else {
              console.log(`[server] ❌ Hash mismatch! Expected ${expectedHash}`);
            }
          });
        }
      } else if (msg.type === "error") {
        console.error(`[server] Error from ${id}: ${msg.message}`);
      }
    } catch {
      // binary chunk
      if (writeStream) {
        receivedBytes += (data as Buffer).length;
        hasher.update(data as Buffer);
        writeStream.write(data);
        const percent = ((receivedBytes / totalBytes) * 100).toFixed(1);
        process.stdout.write(`\r[server] Receiving ${filename}: ${percent}%`);
      }
    }
  });

  ws.on("close", () => {
    if (id) {
      clients.delete(id);
      console.log(`\n[server] Client disconnected: ${id}`);
    }
  });
});

app.get("/clients", (req, res) => res.json({ clients: Array.from(clients.keys()) }));

app.post("/download/:id", async (req, res) => {
  const id = req.params.id;
  const ws = clients.get(id);
  if (!ws) return res.status(404).json({ error: "not connected" });

  console.log(`[server] Sending request_file to ${id}`);
  sendControl(ws, { type: "request_file" });
  res.json({ status: "triggered" });
});

const argv = yargs(hideBin(process.argv)).argv;
const PORT = 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
