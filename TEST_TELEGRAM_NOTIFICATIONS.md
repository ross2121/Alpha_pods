# Testing Telegram Notifications for Governance Events

## Step 4 Complete: ProposalExecuted/Cancelled + Telegram Notifications

**What was implemented:**
- ✅ `ProposalExecuted` event parsing → updates proposal state to `Executed`
- ✅ `ProposalCancelled` event parsing → updates proposal state to `Cancelled`
- ✅ `ProposalDefeated` event parsing → updates proposal state to `Defeated`
- ✅ Telegram notifications sent to subscribed users when:
  - New proposal is created
  - Vote is cast
  - Proposal is executed/cancelled/defeated

---

## How to Test in Telegram

### Step 1: Create a Subscription

You need to create a `Subscription` record in your database linking a user to a realm.

**Option A: Via SQL (quick test)**

```sql
-- 1. Find your user's ID (replace with your telegram_id)
SELECT id, telegram_id, name FROM "User" WHERE telegram_id = 'YOUR_TELEGRAM_ID';

-- 2. Find the realm ID (from the ProposalCreated test)
SELECT id, pubkey, name FROM "Realm" WHERE pubkey = 'FMEWULPSGR1BKVJK4K7xTBaG7EQ5fawwrEwBmBTmyTuK';

-- 3. Create subscription (replace userId and realmId with actual values)
INSERT INTO "Subscription" (
  id,
  "userId",
  "realmId",
  "min_value_usd",
  "notify_on_authority_change",
  "notify_on_new_proposal",
  "notify_on_final_result"
) VALUES (
  gen_random_uuid(),
  YOUR_USER_ID,  -- Replace with your user.id (BigInt)
  'YOUR_REALM_ID',  -- Replace with realm.id (UUID string)
  NULL,
  true,
  true,
  true
);
```

**Option B: Via Prisma Studio**

```bash
npx prisma studio
```

Then navigate to `Subscription` table and create a new record.

---

### Step 2: Test ProposalCreated Notification

1. **Make sure you have a subscription** (from Step 1)

2. **Send ProposalCreated webhook:**
   ```bash
   curl -X POST http://localhost:8000/webhooks/governance \
     -H "Content-Type: application/json" \
     -d '{
       "type": "PROPOSAL_CREATED",
       "proposal": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
       "realm": "FMEWULPSGR1BKVJK4K7xTBaG7EQ5fawwrEwBmBTmyTuK",
       "governance": "GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw",
       "realmName": "Test DAO",
       "title": "Test Proposal: Upgrade Program",
       "description": "This is a test proposal"
     }'
   ```

3. **Check your Telegram** - You should receive a message like:
   ```
   🗳️ **New Governance Proposal Created**
   
   **Realm:** Test DAO
   **Title:** Test Proposal: Upgrade Program
   **Proposal:** `7xKXtg2C...JosgAsU`
   **Category:** UpgradeAuthority
   
   [View on Solscan](...)
   ```

---

### Step 3: Test ProposalVoted Notification

1. **Send ProposalVoted webhook:**
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

2. **Check your Telegram** - You should receive:
   ```
   ✅ **New Vote Cast**
   
   **Proposal:** Test Proposal: Upgrade Program
   **Voter:** `5FHneW46...JM694ty`
   **Vote:** Yes
   **Proposal:** `7xKXtg2C...JosgAsU`
   ```

---

### Step 4: Test ProposalExecuted Notification

1. **Send ProposalExecuted webhook:**
   ```bash
   curl -X POST http://localhost:8000/webhooks/governance \
     -H "Content-Type: application/json" \
     -d '{
       "type": "PROPOSAL_EXECUTED",
       "proposal": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
     }'
   ```

2. **Check your Telegram** - You should receive:
   ```
   ✅ **Proposal EXECUTED**
   
   **Realm:** Test DAO
   **Title:** Test Proposal: Upgrade Program
   **Proposal:** `7xKXtg2C...JosgAsU`
   
   [View on Solscan](...)
   ```

---

### Step 5: Test ProposalCancelled Notification

```bash
curl -X POST http://localhost:8000/webhooks/governance \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PROPOSAL_CANCELLED",
    "proposal": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
  }'
```

**Expected Telegram message:**
```
🚫 **Proposal CANCELLED**
...
```

---

## Troubleshooting

### No Telegram notifications received?

1. **Check subscription exists:**
   ```sql
   SELECT s.*, u.telegram_id, r.name as realm_name
   FROM "Subscription" s
   JOIN "User" u ON s."userId" = u.id
   JOIN "Realm" r ON s."realmId" = r.id;
   ```

2. **Check server logs** for errors:
   - Look for `[governance-indexer] Failed to notify user...`
   - Check if `TELEGRAM_API` env var is set correctly

3. **Verify bot can send messages:**
   - Make sure you've started a chat with the bot (`/start`)
   - Bot needs to be able to send you DMs

4. **Check notification flags:**
   - `notify_on_new_proposal` must be `true` for ProposalCreated/Voted
   - `notify_on_final_result` must be `true` for Executed/Cancelled/Defeated

---

## Next Steps

Once notifications work, we can add:
- **Telegram commands** to subscribe/unsubscribe (`/subscribe`, `/alerts`)
- **Filter by amount** (only notify if `estimated_value_usd >= X`)
- **Digest mode** (daily summary instead of instant notifications)
- **Voting from Telegram** (buttons to vote directly)

