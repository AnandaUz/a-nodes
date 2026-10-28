# Core Directives

- **Zero fluff (V2):** No conversational fillers or prompt echoing. Maximum brevity. Запрещён пересказ изменённого кода: вывод только кликабельных ссылок `[файл](file://...#L)` и резюме максимум в 1 предложение. Всегда отвечать на русском.
- **Code edits:** Minimal targeted diffs/patches only. Never rewrite entire files. В `TargetContent` брать минимальный контекст для уникальности (1-2 строки до и после). При нескольких несвязанных правках одного файла всегда использовать `multi_replace_file_content` в один вызов.
- **Search & viewing:** При известной сигнатуре читать узкий диапазон (±30–50 строк) через `StartLine`/`EndLine`. В `grep_search` обязательно указывать `Includes` (напр. `["*.ts"]`) и точный подкаталог в `SearchPath`.
- **Artifacts & Paths:** Запрещено создавать промежуточные markdown-артефакты в brain/artifacts без прямого запроса пользователя. В тексте использовать компактные относительные пути.
- **Tests & Commands:** Тесты только при `/a-fix-bug` (`!баг`) или `/a-create-test` (`аСоздаёмТест`). Описания тестов на русском. Запуск с флагами подавления вербозности: `npx vitest run --reporter=basic <target.test.ts>` или `npx vitest related --run <file.ts>`.
- **TypeScript (erasableSyntaxOnly):** Запрещены parameter properties в конструкторах и `enum` (union types / `as const`).
- **Typecheck:** Для быстрой валидации типов использовать `npm --prefix client run typecheck` (`tsc --noEmit`).
- **Dev-серверы:** Dev-серверы уже запущены пользователем (`dev:client`, `dev:server`). Запрещено запускать или перезапускать их без прямого указания.
- **Ротация сессий:** Завершать текущий диалог по завершении задачи (`..<задача>`), новую фичу начинать в чистом диалоге.

# Project Keywords

- `..<name>`: читать `.tasks/<name>.md`. Если отсутствует — создать по компактному формату чек-листа (`- [ ]`, без длинных эссе и логов).
- `!<term>`: читать строго соответствующий модуль `.agents/glossary/<term>.md` (см. [.agents/glossary/index.md](file:///d:/_sites/a-node(v.AI)/.agents/glossary/index.md)). Использовать готовые классы/файлы без предварительного grep-поиска.
- `@путь/к/файлу` или `!<Класс.метод>`: переходить напрямую к файлу/методу без предварительного grep-поиска.
- `/a-fix-bug` или `!баг`: запуск скилла `.agents/skills/a-fix-bug/SKILL.md`.
- `/a-create-test` или `аСоздаёмТест <Класс|Модуль>`: запуск скилла `.agents/skills/a-create-test/SKILL.md`.
- `!найти <запрос>`: резолв `!<term>` через `.agents/glossary/`, затем точечный grep с фильтрами `Includes` и узким `SearchPath`. Вывод: только кликабельные ссылки на код.

# Glossary Contribution Rules

При добавлении или обновлении терминов:
- Создавать/обновлять отдельный файл в `.agents/glossary/<term>.md` и регистрировать в `.agents/glossary/index.md`.
- Формат заголовка: `## <Russian Term> / <English Term>`.
- Однострочное определение назначения.
- Компактный список маппинга сущностей (Logic, View, DB/Manager).
- 3-5 шагов жизненного цикла (Lifecycle).

