---
name: a-deploy
description: >-
  Деплой и верификация релиза в Google Cloud Run (!деплой / /a-deploy).
  Активируется при /a-deploy, фразах "задеплой", "деплой в облако", "обнови прод", "выкати в прод" или !деплой.
---

# Деплой в Cloud Run (/a-deploy)

Регламент безопасного деплоя проекта в Google Cloud Run с валидацией типов, мониторингом Cloud Build и smoke-проверкой сервиса.

## Параметры сервиса
- **GCP Project:** `liner-486905`
- **Cloud Run Service:** `a-nodes`
- **Region:** `europe-west1`
- **Service URL:** `https://a-nodes-ey53cagdla-ew.a.run.app`
- **GCloud Path:** `C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd`

## Ограничения
1. Запрещено пушить при наличии ошибок локальной компиляции (`build:server`) или `typecheck`.
2. Запрещено пушить в обход ветки `main` (триггер Cloud Build слушает только `^main$`).
3. При ошибке сборки Cloud Build немедленно останавливать процесс и выводить точный лог ошибки.

## Входные данные (Аргументы)
- `$1` (Сообщение коммита): опционально, если есть незакоммиченные изменения. По умолчанию — краткое описание внесенных правок.

## Пошаговый алгоритм

### 1. Pre-flight проверки (локально)
1. Проверить типы клиента:
   ```powershell
   npm --prefix client run typecheck
   ```
2. Проверить сборку сервера:
   ```powershell
   npm --prefix server run build
   ```
   *Если любая из проверок упала — остановить процесс и сообщить об ошибке.*

### 2. Git синхронизация
1. Проверить текущую ветку:
   ```powershell
   git branch --show-current
   ```
   *Ветка обязана быть `main`.*
2. Если есть незакоммиченные файлы:
   ```powershell
   git add .
   git commit -m "<сообщение>"
   ```
3. Запушить изменения:
   ```powershell
   git push origin main
   ```

### 3. Мониторинг Cloud Build
1. Получить ID запущенного билда:
   ```powershell
   & "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" builds list --project=liner-486905 --limit=1 --format="value(id,status)"
   ```
2. Дождаться завершения сборки и отслеживать статус (`WORKING` -> `SUCCESS` или `FAILURE`).
3. При статусе `FAILURE` вывести диагностический лог:
   ```powershell
   & "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" builds log <BUILD_ID> --project=liner-486905
   ```

### 4. Верификация Cloud Run (Smoke Test)
1. Проверить статус ревизии сервиса:
   ```powershell
   & "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" run services describe a-nodes --project=liner-486905 --region=europe-west1 --format="value(status.latestReadyRevisionName,status.conditions[0].status)"
   ```
2. Выполнить HTTP-запрос к живому URL:
   ```powershell
   curl -I https://a-nodes-ey53cagdla-ew.a.run.app
   ```
3. Вывести отчет максимум в 2 строки: статус ревизии и доступность URL.

