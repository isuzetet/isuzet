# RUIT CBE — Non-Negotiable Coding Rules
# VIOLATING THESE RULES WILL BREAK THE ENTIRE SYSTEM

## Rule 1: NEVER ESM
NEVER add "type": "module" to any package.json.
NEVER use import/export with .js extensions.
ALWAYS use CommonJS (require/module.exports style is fine but 
TypeScript import/export syntax compiled to CommonJS is correct).
Check: if you see "type": "module" in any package.json you are about to write — STOP and remove it.

## Rule 2: Prisma Field Names Are camelCase
ALWAYS: createdAt, updatedAt, fleetOwnerId, weightKg
NEVER: created_at, updated_at, fleet_owner_id, weight_kg
The database columns are snake_case but Prisma maps them to camelCase.
Always use camelCase in ALL Prisma queries.

## Rule 3: Prisma Model Names Are Singular
ALWAYS: prisma.user, prisma.load, prisma.truck, prisma.driver
NEVER: prisma.users, prisma.loads, prisma.trucks, prisma.drivers

## Rule 4: Never Mix Include and Nested Select
WRONG:
```typescript
prisma.load.findMany({
  include: {
    driver: {
      select: { name: true }  // WRONG — mixing include and nested select
    }
  }
})
```
RIGHT:
```typescript
// Either use include fully:
prisma.load.findMany({ include: { driver: true } })
// Or use select fully:
prisma.load.findMany({ select: { id: true, driver: { select: { name: true } } } })
```

## Rule 5: Never Set updatedAt Manually
Prisma handles updatedAt automatically via @updatedAt decorator.
NEVER include updatedAt in create or update operations.

## Rule 6: Financial Mutations Use Transactions
ANY operation that touches money (escrow, financialTransaction, 
wallet balance) MUST use prisma.$transaction().
```typescript
await prisma.$transaction(async (tx) => {
  await tx.escrow.update(...)
  await tx.financialTransaction.create(...)
});
```

## Rule 7: tsconfig Paths
Each engine's tsconfig.json must have:
- For tsx runtime (development): paths pointing to src/index.ts
- For tsc compilation: paths pointing to dist/index.d.ts
Never add composite: true to engine tsconfigs.
Never add moduleResolution: bundler — use node.

## Rule 8: Always Use generateId
NEVER use Math.random(), uuid(), or any other ID generation.
ALWAYS use generateId('prefix') from @ruit/shared-db.
```typescript
import { generateId } from '@ruit/shared-db';
const id = generateId('stop'); // for load_stops
const id = generateId('exp');  // for expenses
const id = generateId('mnt');  // for truck_maintenance
```

## Rule 9: Migration Rules — ADDITIVE ONLY
When modifying existing Prisma models:
- NEVER drop a column
- NEVER rename a column  
- NEVER change a column type that would lose data
- ALWAYS add new columns as optional (?) or with @default()
- If you need to "rename" something: add new field, keep old field

## Rule 10: Build Order After Schema Changes
1. Edit schema.prisma
2. Run migration in packages/shared-db
3. Run pnpm build in packages/shared-db
4. Run pnpm build in any other changed package
5. Run pnpm -r build to rebuild everything
6. Test each engine health endpoint

## Rule 11: Fastify Route Pattern
```typescript
// CORRECT Fastify route pattern used in this project
fastify.post('/endpoint', {
  preHandler: [requireAuth, requireRole(['FLEET_OWNER'])],
}, async (request, reply) => {
  const body = request.body as { fieldName: string };
  // ... logic
  return reply.send({ success: true, data: result });
});
```

## Rule 12: Error Handling Pattern
```typescript
try {
  // operation
} catch (error) {
  request.log.error(error);
  return reply.status(500).send({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Operation failed' }
  });
}
```

## Rule 13: File Validation Before Saving
Before saving ANY file you create or modify:
1. Check for TypeScript syntax errors mentally
2. Verify all imports resolve to real files/packages
3. Verify Prisma model names match schema exactly
4. Verify no "type": "module" crept in
5. Verify response format matches { success, data } or { success, error }
Only save if all checks pass.

## Rule 14: Shared Package Changes Ripple
If you change packages/shared-db (schema, exports):
  → ALL 13 engines need their imports checked
  → ALL workers need their imports checked
If you change packages/shared-queue (QUEUES):
  → ALL engines that enqueue jobs need updating
  → ALL workers that consume queues need updating
If you change packages/shared-auth (roles):
  → ALL routes using requireRole need checking

## Rule 15: Amounts Are Integers in ETB Cents
All monetary amounts stored as integers representing cents.
1 ETB = 100 units in the database.
When displaying: divide by 100.
When storing: multiply by 100.
formatETB() from shared-utils handles display formatting.
