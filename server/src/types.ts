export interface WSControlMessage {
  type: "register" | "request_file" | "start" | "done" | "error" | "hash";
  clientId?: string;
  filename?: string;
  filesize?: number;
  message?: string;
  hash?: string;
}