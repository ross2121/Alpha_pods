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

---

## Step 3: Testing ProposalVoted Events

### Test Vote Event

**Prerequisites:** You need a proposal already indexed (from Step 2 above).

```bash
curl -X POST http://localhost:8000/webhooks/governance \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PROPOSAL_VOTED",
    "proposal": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "voter": "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    "vote": 1,
    "slot": 123456789,
    "signature": "5j7s8K9mN2pQrS4tU6vW8xY0zA1bC3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5z"
  }'
```

**Expected result:**
- HTTP response: `{ ok: true, indexed: true }`
- Server logs: `✓ Indexed ProposalVoted: ... voted Yes on ...`
- Database: New `GovernanceVote` record created
- If proposal was `Draft`, it's updated to `Voting` state

### Test Different Vote Types

**Vote "No":**
```bash
curl -X POST http://localhost:8000/webhooks/governance \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PROPOSAL_VOTED",
    "proposal": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "voter": "AnotherVoterPubkey123456789012345678901234567890",
    "vote": 0,
    "slot": 123456790,
    "signature": "AnotherTxSignature123456789012345678901234567890"
  }'
```

**Vote "Abstain" (numeric 2 or string):**
```bash
curl -X POST http://localhost:8000/webhooks/governance \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PROPOSAL_VOTED",
    "proposal": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "voter": "YetAnotherVoterPubkey123456789012345678901234567",
    "vote": 2,
    "slot": 123456791,
    "signature": "YetAnotherTxSignature123456789012345678901234567"
  }'
```

### Verify Votes in Database

```sql
-- Check all votes for a proposal
SELECT 
  gv.*,
  gp.title as proposal_title,
  gp.state as proposal_state
FROM "GovernanceVote" gv
JOIN "GovernanceProposal" gp ON gv."proposalId" = gp.id
WHERE gp.proposal_pubkey = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
```

---

---

## Step 4: Testing ProposalExecuted/Cancelled Events

### Test ProposalExecuted

```bash
curl -X POST http://localhost:8000/webhooks/governance \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PROPOSAL_EXECUTED",
    "proposal": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
  }'
```

**Expected result:**
- HTTP response: `{ ok: true, indexed: true }`
- Server logs: `✓ Updated proposal ... state to Executed`
- Database: Proposal state updated to `Executed`
- **Telegram notification sent** (if user is subscribed)

### Test ProposalCancelled

```bash
curl -X POST http://localhost:8000/webhooks/governance \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PROPOSAL_CANCELLED",
    "proposal": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
  }'
```

### Test ProposalDefeated

```bash
curl -X POST http://localhost:8000/webhooks/governance \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PROPOSAL_DEFEATED",
    "proposal": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
  }'
```

---

## Telegram Notifications Testing

**See `TEST_TELEGRAM_NOTIFICATIONS.md` for complete guide on:**
- How to create subscriptions
- How to test notifications in Telegram
- Troubleshooting notification issues

---

## Next Steps (After You Approve)

Once this works, we'll add:
- **RealmCreated** event parsing
- **Telegram commands** for subscription management (`/subscribe`, `/alerts`)
- Enrichment: fetch full proposal details from on-chain (title, description, instructions)
- Filter notifications by amount (only notify if `estimated_value_usd >= X`)

