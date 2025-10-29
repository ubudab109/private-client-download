# Silentmode Software Engineer Home Assignment

## Overview
This project demonstrates a reverse WebSocket communication system for securely transferring large files (e.g., 100MB) from private clients (like restaurant POS systems) to a public server.

Clients connect to the server and stay online. When the server triggers a download request via REST API, the corresponding client streams the requested file chunk-by-chunk using WebSocket.

---

## Features
- Reverse WebSocket connection (clients initiate connection)
- Server triggers file transfer via HTTP API
- 64KB chunk-based streaming for large files
- Progress bar on both client and server
- Automatic SHA256 checksum verification for integrity

---

## Architecture
```
┌──────────┐        WebSocket        ┌───────────┐
│  Client  │ <────────────────────── │  Server   │
│ (behind  │                        │  (public) │
│  NAT)    │ ────────HTTP──────────> │  API      │
└──────────┘       /download/:id     └───────────┘
```

---

## Getting Started

### 1️⃣ Start the Server
```bash
cd server
npm install
npm run dev
```
Server output:
```
Server running on port 3001
```

---

### 2️⃣ Start a Client
```bash
cd client
npm install
npm run start -- --id=client1 --file=./file_to_download.txt
```
Client output:
```
connected to ws://localhost:3001
registered as client1
```

---

### 3️⃣ Trigger Download
Run via API:
```bash
curl -X POST http://localhost:3001/download/client1
```

Expected output:

#### Client:
```
[client] Sending file: data.bin (104857600 bytes)
[client] SHA256: 0fce29e...
[client] Uploading data.bin: 100.0%
[client] File sent successfully
```

#### Server:
```
[server] Registered client client1
[server] Sending request_file to client1
[server] Start receiving data.bin from client1 (104857600 bytes)
[server] Receiving data.bin: 100.0%
[server] Finished receiving from client1
[server] Final SHA256: 0fce29e...
[server] ✅ Hash verified successfully
```

---

## Folder Output
After successful transfer, you'll find:
```
server/downloads/client1_<timestamp>_data.bin
```

---

## Verification
Both files (original and received) must have identical SHA256 hashes:

```bash
sha256sum file_to_download.txt
sha256sum server/downloads/client1_<timestamp>_data.bin
```

If both checksums match, the transfer was successful ✅.


---

## Author
**Muhammad Rizky Firdaus**  
Home assignment for *Silentmode* — Software Engineer position.
