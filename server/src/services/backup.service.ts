import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import mongoose from 'mongoose';

/**
 * Определяет директорию бэкапов в основном репозитории (A:/a-node_2.0/db_backups),
 * даже если сервер запущен из git worktree.
 */
export function getBackupDir(): string {
  try {
    const gitCommonDir = execSync('git rev-parse --git-common-dir', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (gitCommonDir) {
      const mainRepo = path.resolve(gitCommonDir, '..');
      return path.join(mainRepo, 'db_backups');
    }
  } catch {
    // игнорируем ошибку git
  }

  if (fs.existsSync('A:/a-node_2.0')) {
    return 'A:/a-node_2.0/db_backups';
  }
  return path.resolve(process.cwd(), 'db_backups');
}

function formatDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function formatDateTime(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${formatDate(date)} ${p(date.getHours())}:${p(date.getMinutes())}`;
}

export interface BackupOptions {
  force?: boolean;
}

/**
 * Выполняет экспорт коллекций MongoDB в JSON и коммит в изолированный git-репозиторий внутри db_backups.
 * По умолчанию запускается 1 раз в день (если сегодня уже был — пропускается).
 */
export async function runDailyBackup(options: BackupOptions = {}): Promise<boolean> {
  const backupDir = getBackupDir();
  const markerFile = path.join(backupDir, '.last_backup');
  const todayStr = formatDate(new Date());

  if (!options.force && fs.existsSync(markerFile)) {
    try {
      const last = fs.readFileSync(markerFile, 'utf-8').trim();
      if (last === todayStr) {
        return false;
      }
    } catch {
      // при ошибке чтения маркера продолжаем
    }
  }

  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    console.warn('[backup] Подключение к MongoDB не готово для бэкапа');
    return false;
  }

  fs.mkdirSync(backupDir, { recursive: true });

  const gitDir = path.join(backupDir, '.git');
  if (!fs.existsSync(gitDir)) {
    try {
      execSync('git init', { cwd: backupDir, stdio: 'ignore' });
      execSync('git config user.name "DB Backup"', { cwd: backupDir, stdio: 'ignore' });
      execSync('git config user.email "backup@local"', { cwd: backupDir, stdio: 'ignore' });
    } catch (e) {
      console.error('[backup] Ошибка инициализации Git в db_backups:', e);
    }
  }

  console.log(`[backup] Создание дампа базы в ${backupDir}...`);

  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      if (col.name.startsWith('system.')) continue;

      const docs = await mongoose.connection.db
        .collection(col.name)
        .find({})
        .sort({ _id: 1 })
        .toArray();

      const outPath = path.join(backupDir, `${col.name}.json`);
      fs.writeFileSync(outPath, JSON.stringify(docs, null, 2), 'utf-8');
    }

    fs.writeFileSync(markerFile, todayStr, 'utf-8');

    if (fs.existsSync(gitDir)) {
      execSync('git add .', { cwd: backupDir, stdio: 'ignore' });
      const status = execSync('git status --porcelain', {
        cwd: backupDir,
        encoding: 'utf-8',
      }).trim();

      if (status) {
        const commitMsg = `backup: ${formatDateTime(new Date())}`;
        execSync(`git commit -m "${commitMsg}"`, {
          cwd: backupDir,
          stdio: 'ignore',
        });
        console.log(`[backup] Дамп успешно закоммичен: "${commitMsg}"`);
      } else {
        console.log('[backup] Изменений в базе нет, дамп идентичен предыдущему');
      }
    }

    return true;
  } catch (err) {
    console.error('[backup] Ошибка создания бэкапа:', err);
    return false;
  }
}

