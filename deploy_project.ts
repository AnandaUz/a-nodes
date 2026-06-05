import { rmSync, cpSync, copyFileSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

const projectName = "a-nodes";

const SERVER_PORT = "4010";
const CLIENT_PORT = "4000";

const DEPLOY = `D:/_sites/worked/${projectName}`;
const SOURCE = `D:/_sites/${projectName}`;

console.log("Starting build client");

execSync("npm run build", { cwd: `${SOURCE}/client`, stdio: "inherit" });
console.log("Starting build server");

execSync("npm run build", { cwd: `${SOURCE}/server`, stdio: "inherit" });

console.log("Starting removing old client");

// // копирование клиента
rmSync(`${DEPLOY}/client`, { recursive: true, force: true });
console.log("Starting copying new client");
cpSync(`${SOURCE}/client/dist`, `${DEPLOY}/client`, { recursive: true });
console.log("Starting removing old server");

// // копирование сервера
rmSync(`${DEPLOY}/server`, { recursive: true, force: true });
console.log("Starting copying new server");
cpSync(`${SOURCE}/server/dist`, `${DEPLOY}/server`, { recursive: true });
console.log("Starting copying package.json");
copyFileSync(`${SOURCE}/server/package.json`, `${DEPLOY}/server/package.json`);
copyFileSync(`${SOURCE}/.env`, `${DEPLOY}/server/.env`);

// заменяю порт для локалки
const envPath = `${DEPLOY}/server/.env`;
let envContent = readFileSync(envPath, "utf-8");
envContent = envContent.replace(/^PORT=.*/m, `PORT=${SERVER_PORT}`);
envContent = envContent.replace(
  /^CLIENT_URL=.*/m,
  `CLIENT_URL=http://localhost:${CLIENT_PORT}`,
);
writeFileSync(envPath, envContent);

// // установка зависимостей
console.log("Starting installing dependencies");
execSync("npm install --omit=dev", {
  cwd: join(DEPLOY, "server"),
  stdio: "inherit", // выводит логи npm в консоль
});

console.log(`

!!! Deployment finished ------------------------


`);
