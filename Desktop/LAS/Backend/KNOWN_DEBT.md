# Known Technical Debt

## Phase 5: Agent Load Posting — Backend Not Ready

**Status**: Frontend code complete but feature disabled pending backend integration  
**Date Identified**: 2026-03-20  
**Impact**: CRITICAL — Silent data corruption risk if enabled without backend support  
**Frontend Code**: `isuzet_field/lib/features/agent/presentation/agent_post_load_screen.dart`

### Problem

The Load schema in Prisma lacks the fields required for agents to post loads on behalf of clients:

1. **Missing `agentId` field in Load model**
   - Load model has `ordererId` only (FK to Orderer)
   - No way to track which agent posted the load
   - No way to allocate commissions to agent

2. **AgentClient model not defined**
   - User model references AgentClient in relationships:
     ```
     agentClients      AgentClient[] @relation("AgentToClients")
     clientAgentRels   AgentClient[] @relation("ClientToAgents")
     ```
   - Model is referenced but does not exist in schema
   - Cannot establish agent-client relationships

3. **No agent-specific load posting endpoint**
   - `/api/v1/agent/post-load` does not exist
   - `/api/v1/dispatch/loads` only handles orderer-posted loads
   - No schema validation for agent posting context

4. **No commission tracking for agent-posted loads**
   - ConsolidationAgent model has commission rate but Load model doesn't link to it
   - No mechanism to track and settle agent commissions
   - FinancialTransaction model doesn't support agent commission entries

### Required Backend Changes

**Change 1: Add agentId to Load model**
```prisma
model Load {
  id                String        @id @db.VarChar(26)
  ordererId         String        @map("orderer_id")
  agentId           String?       @map("agent_id") @db.VarChar(26)  // ADD THIS
  // ... rest of fields ...
}
```

**Change 2: Define AgentClient model**
```prisma
model AgentClient {
  id           String    @id @db.VarChar(26)
  agentUserId  String    @map("agent_user_id") @db.VarChar(26)
  clientUserId String    @map("client_user_id") @db.VarChar(26)
  status       String    @default("ACTIVE")
  addedAt      DateTime  @default(now()) @map("added_at")
  
  agent        User      @relation("AgentToClients", fields: [agentUserId], references: [id])
  client       User      @relation("ClientToAgents", fields: [clientUserId], references: [id])
  
  @@unique([agentUserId, clientUserId])
  @@map("agent_clients")
}
```

**Change 3: Build or extend agent load posting endpoint**

Option A: Create new endpoint
```
POST /api/v1/agent/post-load
Auth: Agent role required
Body: {
  clientPhone: string (required)
  corridorId: string (required)
  cargoType: string (required)
  weightKg: number (required)
  pickupDate: ISO 8601 string (required)
  deliveryDeadline: ISO 8601 string (required)
  specialInstructions?: string
  requiresReefer?: boolean
}
Handler:
1. Get agent user ID from JWT
2. Look up client by phone → get clientUserId
3. Verify AgentClient relationship exists
4. Create Load with agentId and clientUserId → ordererId mapping
5. Track commission in FinancialTransaction or new commission ledger
```

Option B: Extend existing endpoint
```
POST /api/v1/dispatch/loads
Add optional field: agentId (string)
If agentId provided:
  - Validate agent exists
  - Validate agent-client relationship
  - Store agentId on Load record
  - Calculate and reserve agent commission
```

**Change 4: Add commission tracking**
- Extend FinancialTransaction model or create new AgentCommissionLedger
- Implement settlement logic for agent commissions
- Add to payout pipeline (separate from fleetsOwner payouts)

### Frontend Status

**Disabled but production-ready**:
- AgentPostLoadScreen shows "Coming Soon" in English + Amharic
- Form code and submission logic preserved in git history
- All models (AgentProfile, PostLoadOnBehalfRequest, LoadSummary) ready
- AgentService methods ready (will POST to correct endpoint)
- Riverpod providers ready

**To re-enable**:
1. Backend implements 4 changes above
2. Confirm POST endpoint and schema with backend team
3. Replace placeholder UI with form submission logic
4. Test end-to-end: agent login → post load → verify database record + commission allocation

### Why This Matters

Agent posting is a core Phase 5 feature but requires careful backend coordination:
- **Data integrity**: If enabled without agentId field, loses agent attribution entirely
- **Commission leakage**: If commission tracking isn't implemented, agent earnings disappear
- **Compliance**: Agent relationships (AgentClient) must be validated before posting

### Related System Components

- **Phase 5 Frontend**: isuzet_field/lib/features/agent/
- **Phase 5 Routes**: /agent, /agent/post-load, /agent/clients (implemented ✓)
- **Phase 5 Auth**: AGENT role redirect to /agent (implemented ✓)
- **Backend Schema**: packages/shared-db/prisma/schema.prisma

### Timeline

- **Identified**: 2026-03-20 (pre-approval verification)
- **Decision**: Phase 5 approved with feature disabled
- **Estimated Backend Work**: 2-3 days (schema changes + endpoint + commission logic)
- **Team**: Backend eng + Copilot frontend (when backend ready)
