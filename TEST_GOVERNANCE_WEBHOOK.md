# Testing Governance Indexer Webhook

## Step 2 Complete: ProposalCreated Event Parsing

The governance indexer now:
- ✅ Parses `ProposalCreated` events from Helius webhooks
- ✅ Upserts `Realm` records (creates if missing)
- ✅ Creates `GovernanceProposal` records with proper categorization
- ✅ Handles both array and single event formats

---

## How to Test

### Option 1: Manual curl test (local)

1. **Start your server:**
   ```bash
   npm run dev
   # or
   npm start
   ```

2. **Send a test webhook payload:**
   ```bash
   curl -X POST http://localhost:4000/webhooks/governance \
     -H "Content-Type: application/json" \
     -d '{
       "type": "PROPOSAL_CREATED",
       "proposal": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
       "realm": "FMEWULPSGR1BKVJK4K7xTBaG7EQ5fawwrEwBmBTmyTuK",
       "governance": "GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw",
       "realmName": "Test DAO",
       "title": "Test Proposal: Upgrade Program",
       "description": "This is a test proposal for upgrading the program"
     }'
   ```

3. **Check your database:**
   ```sql
   -- Check if Realm was created
   SELECT * FROM "Realm" WHERE pubkey = 'FMEWULPSGR1BKVJK4K7xTBaG7EQ5fawwrEwBmBTmyTuK';
   
   -- Check if Proposal was created
   SELECT * FROM "GovernanceProposal" WHERE proposal_pubkey = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
   ```

4. **Check server logs:**
   You should see:
   ```
   [governance-webhook] Incoming payload: ...
   [governance-indexer] ✓ Indexed ProposalCreated: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU in realm FMEWULPSGR1BKVJK4K7xTBaG7EQ5fawwrEwBmBTmyTuK
   ```

---

### Option 2: Test with array format (Helius-style)

```bash
curl -X POST http://localhost:4000/webhooks/governance \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "type": "PROPOSAL_CREATED",
        "proposal": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        "realm": "FMEWULPSGR1BKVJK4K7xTBaG7EQ5fawwrEwBmBTmyTuK",
        "governance": "GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw",
        "title": "Treasury Transfer Proposal",
        "description": "Move 10,000 USDC from treasury"
      }
    ]
  }'
```

---

### Option 3: Test via Helius Dashboard (production)

1. **Set up Helius webhook:**
   - Go to Helius Dashboard → Webhooks
   - Create new webhook
   - **Webhook URL:** `https://your-domain.com/webhooks/governance`
   - **Transaction Types:** Select SPL Governance program
   - **Account Addresses:** Add your realm/governance addresses to filter

2. **Create a proposal on-chain:**
   - Use your `/createdao` command to create a realm
   - Create a proposal via Realms UI or programmatically
   - Helius will send the webhook automatically

3. **Monitor logs:**
   Check your server logs for `[governance-indexer]` messages

---

## Expected Database State After Test

After running the curl test, you should have:

1. **Realm record:**
   - `pubkey`: `FMEWULPSGR1BKVJK4K7xTBaG7EQ5fawwrEwBmBTmyTuK`
   - `name`: `Test DAO`
   - `cluster`: `devnet` (or `mainnet-beta`)

2. **GovernanceProposal record:**
   - `proposal_pubkey`: `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`
   - `realmId`: (UUID pointing to Realm)
   - `title`: `Test Proposal: Upgrade Program`
   - `category`: `UpgradeAuthority` (auto-detected from "Upgrade" in title)
   - `state`: `Draft`

---

## Troubleshooting

- **"Missing required fields"**: Check that your payload includes `proposal`, `realm`, and `governance` fields
- **"Invalid pubkey format"**: Ensure all addresses are valid Solana base58 strings
- **Database errors**: Make sure Prisma migrations are up to date: `npx prisma migrate dev`

---

## Next Steps (After You Approve)

Once this works, we'll add:
- **ProposalVoted** event parsing → creates `GovernanceVote` records
- **ProposalExecuted/Cancelled** → updates proposal state
- **RealmCreated** event parsing
- Enrichment: fetch full proposal details from on-chain (title, description, instructions)

