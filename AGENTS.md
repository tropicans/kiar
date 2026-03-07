# AGENTS.md
This file is the working guide for coding agents in this repository.
Follow it for build/test commands, style conventions, and safe change patterns.

## Scope and Priority
- Scope: entire repo at `qrscan/` unless a nested guide says otherwise.
- Nested override: `n8n_workflows/AGENTS.md` contains workflow-specific rules for that subtree.
- Conflict precedence:
  1. Direct user request
  2. This file
  3. Other docs (`README.md`, `DEPLOYMENT.md`, `MIGRATION_GUIDE.md`)

## Rules Files Check
- `.cursorrules`: not found.
- `.cursor/rules/`: not found.
- `.github/copilot-instructions.md`: not found.
- If any are added later, treat them as required and update this file.

## Tech Stack Snapshot
- Frontend: Vite + TypeScript (vanilla DOM).
- Backend: Node.js + Express (ES modules).
- Database: PostgreSQL (`pg`).
- Packaging: npm + `package-lock.json`.
- Runtime split:
  - Browser app in `src/`
  - API server in `server/index.js`
  - Migration/sync scripts in `migration/` and repo root

## Project Layout
- `src/main.ts`: scanner + verification UI logic.
- `src/admin.ts`: admin dashboard logic.
- `src/api.ts`: frontend API service layer.
- `src/style.css`: shared UI styles/tokens.
- `server/index.js`: Express API + static serving.
- `migration/migrate_mudik.js`: primary migration/sync.
- `index.html`, `admin.html`: Vite entry pages.
- `init.sql`: bootstrap schema + seed data.

## Setup and Run Commands
- Install dependencies: `npm ci`
- Frontend dev server: `npm run dev`
- Build frontend: `npm run build`
- Type-check/lint: `npm run lint`
- Preview built app: `npm run preview`
- Run production server: `node server/index.js`

## Docker Commands
- Start stack: `docker compose up -d --build`
- Stop stack: `docker compose down`
- Follow app logs: `docker compose logs -f app`
- Open Postgres shell: `docker exec -it mudik-db psql -U postgres -d kiar`

## Migration and Data Commands
- Final one-shot sync (CSV lokal): `npm run sync:final`
- Primary migration/sync: `node migration/migrate_mudik.js`
- Data validation script: `node check_data.js`

## Test Status and Single-Test Guidance
Current state:
- No test script in `package.json`.
- No committed test files in repo today.

If you add tests, use this default policy:
- Prefer Node built-in runner first (no extra dependency).
- Run all tests: `node --test`
- Run one test file: `node --test path/to/file.test.js`
- Run tests by name: `node --test --test-name-pattern="name fragment"`
- If you adopt Vitest/Jest, add npm scripts and update this section.

## Definition of Done
- Run `npm run lint`.
- Run `npm run build`.
- If backend changes, smoke-test relevant `/api/*` endpoint(s).
- If migration changes, run against disposable/local DB before merge.

## Code Style: General
- Frontend TS uses strict mode (`tsconfig.json`). Keep strictness.
- Backend/migration scripts are JS ESM; keep ESM syntax.
- Prefer small, focused functions over large monolithic blocks.
- Use semicolons consistently in edited files.
- Prefer single quotes in TS/JS.
- Keep trailing commas where supported and used nearby.
- Avoid broad refactors unless explicitly requested.

## Imports and Modules
- Import order:
  1. External packages
  2. Node built-ins
  3. Internal modules
- Keep side-effect imports explicit (example: `import './style.css';`).
- Use `type` imports in TS for type-only symbols when practical.
- Do not introduce CommonJS (`require`, `module.exports`).

## Naming Conventions
- Variables/functions: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` for true constants.
- Types/interfaces: `PascalCase`.
- DB fields stay `snake_case`; map to camelCase in API payloads.
- Preserve Indonesian domain names already in use (`nama`, `penumpang`, etc.).

## Type Safety Guidelines
- Do not disable strict compiler checks globally.
- Avoid `any`; if unavoidable, keep usage narrow and documented.
- Validate unknown JSON before deep property access.
- DOM assertions with `as HTML...` are used in this repo; ensure IDs/selectors exist in HTML.

## Error Handling Guidelines
- Frontend service layer should return structured results (`success`, `error`).
- Show safe user-facing messages; keep raw error detail for logs.
- Backend route expectations:
  - `400`: invalid input
  - `404`: record not found
  - `409`: conflict/state violation
  - `500`: unexpected server error
- Always use parameterized SQL (`$1`, `$2`, ...), never string interpolation.
- Use explicit `BEGIN/COMMIT/ROLLBACK` for multi-step writes.

## API and Data Layer Conventions
- Keep endpoints under `/api/*`.
- Preserve response shape expected by `src/api.ts`.
- Use deterministic SQL ordering (`ORDER BY`) when UI depends on order.
- If adding DB fields, update all layers:
  - SQL select statements
  - Server response mapping
  - Frontend TS interfaces/types

## Frontend Conventions
- Keep scanner logic in `src/main.ts`; admin-only behavior in `src/admin.ts`.
- Reuse existing CSS vars/classes in `src/style.css` before adding new tokens.
- Preserve accessibility attributes and keyboard behavior already present.
- Keep motion/light effects performant for low-end mobile devices.

## Security and Ops Notes
- Never commit secrets from `.env`.
- Keep `dotenv` in server/migration scripts.
- Do not return raw stack traces to API clients.
- Keep static serving constrained to `dist/` and intended asset paths.

## Agent Workflow Recommendations
- Before edits, inspect related TS/JS and HTML together (ID coupling is tight).
- After frontend edits, validate both `index.html` and `admin.html` flows when relevant.
- After API changes, verify callers in `src/api.ts` and impacted UI paths.
- Keep changes localized; avoid unrelated cleanups.

## Maintenance Notes
- Update command sections whenever `package.json` scripts change.
- Add newly created Cursor/Copilot rule files to this document immediately.
- Keep this file concise, actionable, and aligned with real repo behavior.
