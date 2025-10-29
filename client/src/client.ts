import WebSocket from "ws";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
  .option("id", { type: "string", demandOption: true })
  .option("file", { type: "string", demandOption: true })
  .parseSync();

const ws = new WebSocket("ws://localhost:3001");

ws.on("open", () => {
  console.log("connected to ws://localhost:3001");
  ws.send(JSON.stringify({ type: "register", clientId: argv.id }));
  console.log("registered as", argv.id);
});

ws.on("message", async (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === "request_file") {
    const filepath = path.resolve(argv.file);
    const stat = fs.statSync(filepath);
    const filename = path.basename(filepath);
    const filesize = stat.size;

    const hasher = crypto.createHash("sha256");
    const fileBuffer = fs.readFileSync(filepath);
    const fileHash = hasher.update(fileBuffer).digest("hex");

    ws.send(JSON.stringify({ type: "hash", hash: fileHash }));
    ws.send(JSON.stringify({ type: "start", filename, filesize }));

    console.log(`[client] Sending file: ${filename} (${filesize} bytes)`);
    console.log(`[client] SHA256: ${fileHash}`);

    const stream = fs.createReadStream(filepath, { highWaterMark: 64 * 1024 });
    let sent = 0;
    for await (const chunk of stream) {
      sent += chunk.length;
      ws.send(chunk);
      const percent = ((sent / filesize) * 100).toFixed(1);
      process.stdout.write(`\r[client] Uploading ${filename}: ${percent}%`);
    }

    ws.send(JSON.stringify({ type: "done" }));
    console.log("\n[client] File sent successfully");
  }
});
