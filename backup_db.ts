import { readFileSync, mkdirSync } from "fs";
import { execFileSync } from "child_process";

const BACKUP_ROOT = "D:/_sites/bd_backUp";

// читаем .env (MONGODB_URI, MONGODB_BASE_NAME)
const env: Record<string, string> = {};
for (const line of readFileSync(`${__dirname}/.env`, "utf-8").split(/\r?\n/)) {
  const m = line.match(/^\s*([\w]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const mode = (process.env.DB_MODE || env.DB_MODE || "cloud").toLowerCase();
const uri = mode === "local" ? env.MONGODB_URI_LOCAL : env.MONGODB_URI_CLOUD;
const dbName = env.MONGODB_BASE_NAME;
if (!uri) throw new Error(`Mongo URI for mode "${mode}" not found in .env`);

const d = new Date();
const p = (n: number) => String(n).padStart(2, "0");
const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
const out = `${BACKUP_ROOT}/mydb-${stamp}`;

mkdirSync(BACKUP_ROOT, { recursive: true });
console.log(`Dumping ${dbName || "all dbs"} -> ${out}`);

const args = [`--uri=${uri}`, `--out=${out}`];
if (dbName) args.push(`--db=${dbName}`);
execFileSync("mongodump", args, { stdio: "inherit" });

console.log(`\n!!! Backup finished: ${out}\n`);
