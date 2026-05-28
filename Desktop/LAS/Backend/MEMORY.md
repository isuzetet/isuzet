# RUIT CBE — PERSISTENT MEMORY
# Updated: [auto-update on each session]
# ============================================================

## WHAT WE ARE BUILDING
RUIT Central Backend Engine — event-driven LaaS platform for inland Ethiopia.
12 microservice engines + notification service.
Monorepo with pnpm workspaces + Turborepo.
Serves 4 Dyad interfaces.

## CURRENT STATUS
- Phase: 0 — Foundation & Scaffolding COMPLETE
- Active Engine: None (scaffold only)
- Last Completed: Project initialization, all shared packages, 13 engine scaffolds, CI/CD

## STACK (FINAL — NEVER CHANGE)
- TypeScript 5.x strict | Fastify 4.x | Prisma 5.x | Zod 3.x
- BullMQ 5.x | Redis 7 | Socket.IO 4.x | PostgreSQL 16 | TimescaleDB 2.x
- pnpm workspaces | Turborepo | Node.js 20 LTS

## BUILD ORDER
1(identity) → 10(strategy) → 2(optimizer) → 4(liquidity) → 3(corridor) → 5(shock) → 6(incident) → 7(behavior) → 9(fraud) → 8(data) → 11(twin-stub) → 12(health)

## NEXT SESSION TASK
Run pnpm install && pnpm build to verify compilation.
Then implement shared-types fully, then start Engine 1 (identity).

## KNOWN BLOCKERS
None yet.
