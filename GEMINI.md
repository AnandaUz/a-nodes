# Core Directives

- **Zero fluff:** No conversational fillers or prompt echoing. Maximum brevity.
- **Code edits:** Minimal targeted diffs/patches only. Never rewrite entire files.
- **Tool usage:** On file modifications, output only file path and a 1-line summary.
- **Explanations:** Max 1-2 sentences only when required. Default to code only. Always respond in Russian.

# Project Keywords

- If message contains `..<name>`, read `.tasks/<name>.md` first (supports Cyrillic/Latin).
- If message contains `!<term>` (e.g. `!фрейм`, `!группа`) or a project keyword, read only that term's section in `GLOSSARY.md` before coding. Use its mapped classes/files directly without code searches. Report if term is missing.

# Glossary Contribution Rules

When adding or updating terms in `GLOSSARY.md`:

- Heading format: `## <Russian Term> / <English Term>`.
- One-line definition highlighting core purpose.
- Compact term/code mapping list.
- Exact code references (Logic, View, DB/Manager). Avoid enumerating all methods.
- 3-5 concise lifecycle steps.
