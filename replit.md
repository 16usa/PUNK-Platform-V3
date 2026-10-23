# PUNK Platform V3

An imported, responsive demo of a meme-token launchpad concept. Trading, balances, market data, and X Money screens are simulated locally; the app does not connect to Solana or execute trades.

## Run & Operate

- `pnpm --filter @workspace/punk-platform-v3 run dev` — run the PUNK web preview
- `pnpm --filter @workspace/punk-platform-v3 run check` — syntax-check the imported app and server
- `pnpm --filter @workspace/punk-platform-v3 run build` — build the static app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- The preview uses Replit's `PORT` and binds to `0.0.0.0`; no secrets or database are needed by this demo.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/punk-platform-v3/imported/` — full source archive, including its Express server, static UI, images, and original reference panels.
- `artifacts/punk-platform-v3/imported/public/app.js` — demo navigation, token state, simulated trading, forms, and reference gallery.
- `artifacts/punk-platform-v3/imported/public/style.css` — original dark interface and responsive styles.
- `artifacts/punk-platform-v3/TECHNICAL_REPORT.md` — implementation inventory and safe Solana readiness plan.

## Architecture decisions

- The original UI source and reference images are retained under `imported/`; do not replace them with a new template.
- Vite is used to build the static UI; the Replit preview runs the archive's Express server.
- Local browser storage only persists demo tokens, balances, and transactions. It is not a wallet or durable account system.

## Product

The demo includes discovery, token detail and simulated buy/sell, token creation, creator profile, portfolio, transaction history, settings, leaderboard, and the original-reference gallery.

## User preferences

- Preserve the supplied design reference and sample values; do not claim real X Money, wallet, or blockchain functionality.
- Do not publish the app or activate mainnet trading without explicit user approval.

## Gotchas

- User-visible balances and trades are simulated in localStorage and can be reset by clearing site storage.
- No real Solana transactions, deployed contracts, live market feeds, or X integrations exist.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
