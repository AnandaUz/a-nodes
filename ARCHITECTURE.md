# Architecture Overview

## 1. Stack & Structure
- **Monorepo**: npm workspaces (`client`, `server`).
- **Client**: Vite + TypeScript + SCSS (Vanilla TS UI with modular components and SVG canvas engine).
- **Server**: Node.js + Express 5 + TypeScript (`tsx`/`tsc`), MongoDB (`mongoose`), JWT & Google Auth, Telegraf bot.

## 2. Layers & Responsibilities

### Client (`/client/src`)
- `api/`: HTTP wrappers for server endpoints.
- `features/`:
  - `desk/`: Canvas viewport, pan/zoom, grid, and SVG rendering (`DeskSVG`).
  - `nodes/`: Node entities (`VNode` visual node, `LNode` link/logic node).
  - `core/`: Selection and interaction orchestrators (`SelectManager`).
- `pages/`: Page entry points (`desk`, `news`, `register`, `welcome`).
- `components/`: UI overlays, menus, modals (`c-nodes-menu`, `c-user-menu`, `c-popup`).

### Server (`/server/src`)
- `routes/`: Express endpoint definitions.
- `middleware/`: Auth verification, error handling, rate limiting.
- `controllers/`: Business logic, request/response lifecycle.
- `models/` & `schemas/`: Mongoose schemas and data persistence.
- `utils/`: Shared backend helpers and integrations.

## 3. Data Flow
1. **User Action**: Triggered on Client (Canvas / Menu).
2. **State & Render**: Handled locally via `SelectManager` / `DeskSVG`.
3. **Sync / Persistence**: Client calls `api/` -> Server Route -> Auth Middleware -> Controller -> MongoDB Model.
