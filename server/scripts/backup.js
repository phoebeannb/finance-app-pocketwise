import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env") });
const execFileAsync = promisify(execFile);
const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "backups", new Date().toISOString().replace(/[:.]/g, "-"));
await mkdir(output, { recursive: true });
if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required for a backup.");
try {
  await execFileAsync("mongodump", ["--uri", process.env.MONGO_URI, "--out", output], { windowsHide: true });
  console.log(`MongoDB backup written to ${output}`);
} catch (error) {
  throw new Error(`mongodump failed. Install MongoDB Database Tools and ensure mongodump is on PATH. ${error.message}`);
}
