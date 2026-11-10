import "./server/src/config";
import { connectDB } from "./server/src/db";
import { runDailyBackup, getBackupDir } from "./server/src/services/backup.service";
import mongoose from "mongoose";

const force = process.argv.includes("--force") || true;

async function main() {
  console.log(`[backup] Запуск дампа базы в ${getBackupDir()}...`);
  await connectDB();
  const ok = await runDailyBackup({ force });
  await mongoose.disconnect();
  if (ok) {
    console.log("[backup] Готово!");
  } else {
    console.log("[backup] Пропущено или ошибка.");
  }
}

main().catch((err) => {
  console.error("[backup] Ошибка:", err);
  process.exit(1);
});
