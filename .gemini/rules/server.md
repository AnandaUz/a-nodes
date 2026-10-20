---
description: Server-side Express, MongoDB and security rules
globs: "server/**/*"
scope: "server/**/*"
---

# Server & Database Directives

- **Multi-Tenancy & Authorization:**
  - ALL MongoDB operations (`find`, `findOne`, `updateOne`, `bulkWrite`, `delete`, `findByIdAndDelete`) MUST include `{ userId: req.user.id }`.
  - In `saveNodesController`, ensure `node.userId = req.user.id` on every persisted record.
- **Error Handling:**
  - Never swallow errors silently in `catch` blocks (no `catch (e) { return null; }` returning 200).
  - Always log error stack with context and respond with HTTP 500.
- **Mongoose Indexing:**
  - Queries must align with defined compound indexes in [Node.ts](file:///d:/_sites/a-node(v.AI)/server/src/models/Node.ts) (`userId: 1, pageId: 1, inTrash: 1`).
- **Binary / Packed Data:**
  - Validate packed bitfields (`blockL`, `D`) before persisting. Reject corrupt payloads exceeding defined bit ranges.
