# Core Directives

- **Zero fluff:** No pleasantries, no conversational fillers, no repeating the prompt. Be extremely concise.
- **Code edits:** Provide minimal targeted diffs or patches only. NEVER rewrite unchanged code or entire files.
- **Tool usage:** If a file was modified via tool, do not echo the modified code in chat. Output only file path and a 1-line summary.
- **Explanations:** Max 1-2 sentences, only when absolutely necessary. Default to code only.

# Project Keywords

- Если сообщение содержит `..<имя>`, первым делом прочитай `.tasks/<имя>.md` и работай по нему. Имя может быть на кириллице. Примеры: `..меню` -> `.tasks/меню.md.
