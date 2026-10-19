import { readFileSync, readdirSync } from "fs";
import { execFileSync } from "child_process";

const BACKUP_ROOT = "D:/_sites/bd_backUp";

const env: Record<string, string> = {};
for (const line of readFileSync(`${__dirname}/.env`, "utf-8").split(/\r?\n/)) {
  const m = line.match(/^\s*([\w]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const mode = (process.env.DB_MODE || env.DB_MODE || "cloud").toLowerCase();
const uri = mode === "local" ? env.MONGODB_URI_LOCAL : env.MONGODB_URI_CLOUD;
const dbName = env.MONGODB_BASE_NAME;
if (!uri) throw new Error(`Mongo URI for mode "${mode}" not found in .env`);

// последний бэкап (имена mydb-YYYYMMDD-HHmm сортируются лексикографически)
const last = readdirSync(BACKUP_ROOT)
  .filter((n) => n.startsWith("mydb-"))
  .sort()
  .pop();
if (!last) throw new Error(`No backups in ${BACKUP_ROOT}`);
const dir = `${BACKUP_ROOT}/${last}`;

// npm run restore:db -- --drop  => предварительно очистит коллекции в облаке
const drop = process.argv.includes("--drop");

console.log(`Restoring ${dir} -> ${dbName || "all dbs"}${drop ? " (with drop)" : ""}`);

const args = [`--uri=${uri}`];
if (dbName) args.push(`--nsInclude=${dbName}.*`);
if (drop) args.push("--drop");
args.push(dir);
execFileSync("mongorestore", args, { stdio: "inherit" });

console.log("\n!!! Restore finished\n");
