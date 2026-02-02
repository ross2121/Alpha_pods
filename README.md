# Alpha Pods

**Alpha Pods** is a Telegram-based collaborative trading platform built on Solana that enables groups of traders to pool funds and make investment decisions together through secure, transparent, and democratic processes.

## 🎬 Demo Video





https://github.com/user-attachments/assets/3e6e46e4-9343-4804-8b50-2794873a730f


## 📚 Resources

- **Video Demo:** [Watch Demo](https://www.loom.com/share/7233009d2eab4080a7a991d2251f6759)
- **Smart Contract:** [FeozaXSwZZexg48Fup4xLZFN2c9nUsSvtHbWz3V3GQuq](https://explorer.solana.com/address/FeozaXSwZZexg48Fup4xLZFN2c9nUsSvtHbWz3V3GQuq?cluster=devnet)
- **GitHub Repository:** [ross2121/Alpha_pods](https://github.com/ross2121/Alpha_pods)
- **Deployed Bot:** [@Alpha_Pods_bot](https://t.me/Alpha_Pods_bot) (Currently on devnet)
- **Pitch Deck:** [View on Figma](https://www.figma.com/slides/ux37DkTt4eWma0ogto1Fu3/Alpha_POds?node-id=12-1642&t=0e34gzlS1A1lltXD-1)

## 🚀 Quick Start Guide

### Step-by-Step Setup

1. **Create a Telegram Group**
   - Open Telegram and create a new group for your trading pod.
 
2. **Add the Alpha Pods Bot**
   - Search for `@Alpha_Pods_bot` in Telegram and add it to your newly created group.

3. **Make the Bot an Admin**
   - Grant admin privileges to the Alpha Pods bot so it can manage polls, execute commands, and coordinate trading activities.

4. **Invite Your Traders**
   - Add all pod members (traders) to the group. Each member should have their Solana wallet connected.

5. **Automatic Data Storage**
   - The bot will automatically save all member data, including wallet addresses and contributions, to the database and blockchain.

6. **Configure Pod Settings**
   - Set your pod's voting threshold and other parameters to begin collaborative trading.

### Testing on Devnet

You can test the bot with any devnet token. Example token: `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`

## ✨ Features

Alpha Pods offers a comprehensive suite of features designed to make collaborative trading secure, transparent, and efficient. Each feature is built with on-chain security and community governance at its core.

### 🔄 SWAP
Execute token swaps through community consensus. The admin initiates a swap by entering the token mint address and specifying the amount of SOL to convert. A poll is automatically created for all traders to vote on the proposal. Once the swap is approved by the required threshold, the specified amount is transferred from each user's wallet to the secure escrow vault (PDA). The database is updated in real-time to track individual contributions.

If any user has insufficient funds, the bot sends them a private message with instructions to add more SOL. After the swap executes successfully, all funds remain safely in escrow until withdrawal. Currently integrated with Meteora for devnet testing; migration to Jupiter aggregator is planned for mainnet launch.

### 💧 OPEN POSITION
Create and manage liquidity positions collaboratively. Meteora is fully integrated for opening liquidity positions on behalf of the pod. If a liquidity position doesn't exist for the selected token pair, a new pool is created automatically. Like all financial actions, opening positions requires a community vote and threshold approval from pod members.

### 📊 VIEW POSITION
Track all active investments in real-time. View a comprehensive overview of all current liquidity positions held by the pod, including token pairs, amounts, current value, and unrealized P&L. All data is pulled directly from the blockchain for maximum transparency.

### 🔒 CLOSE POSITION
Exit positions and distribute profits fairly. Close liquidity positions through community vote. Once a position is closed, profits are automatically distributed equally among all pod members based on their proportional contributions. All profits are recorded in the on-chain database, ensuring users can see their accurate total balance (initial deposits + cumulative earnings) whenever they choose to withdraw.

### 🤖 AUTO COPY LP
Automated liquidity provision strategies. This feature will enable pods to automatically replicate successful liquidity provision strategies from top-performing traders. *(Currently in active development)*

### 💰 WITHDRAW
Secure, instant access to your funds. Transfer your funds from the secure escrow vault back to your personal wallet at any time. Withdrawals respect your proportional ownership and include both your original contributions and your share of realized profits. All withdrawal transactions are recorded on-chain for complete transparency.

### 📈 MONITOR POSITION
Automated position monitoring and rebalancing. We continuously monitor your liquidity positions to ensure optimal performance. If your position moves out of its profitable range or stops earning fees, we automatically migrate to a different position with better yield potential. You can set custom take profit and stop loss percentages to manage risk according to your strategy.

### 🧠 AI-POWERED TRADE ANALYSIS & RECOMMENDATIONS
Intelligent insights for smarter trading decisions. Our AI agent continuously analyzes market conditions, monitors pod performance, and evaluates potential trading opportunities in real-time. It provides actionable recommendations directly in the Telegram chat, such as:

- Identifying optimal entry and exit points based on technical analysis and market sentiment
- Suggesting high-potential liquidity pools with favorable risk-reward ratios
- Alerting the pod to emerging trends and whale movements
- Analyzing historical pod performance to recommend strategy improvements
- Providing natural language explanations of complex market data for less experienced traders

When the AI identifies a promising opportunity, it automatically creates a proposal with detailed analysis for pod members to vote on. This combines the wisdom of human collective decision-making with the speed and analytical power of AI, helping pods make better-informed trading decisions faster. *(Planned feature using advanced LLMs and on-chain data analysis)*

## 📊 Trading Strategies

### Simple Strategy
- **Range:** -5% to +5% spot strategy using Meteora
- **Allocation:** 50% Token X and 50% Token Y
- **Take Profit:** 50%
- **Stop Loss:** -50%

### Complex Strategy
- **Range:** -65% to 0% bid-ask strategy using Meteora
- **Allocation:** 0% Token X and 100% Token Y
- **Take Profit:** 30%
- **Stop Loss:** -30%

### Custom Strategy
Choose any strategy powered by Meteora with custom token distribution according to your preferences, along with customizable take profit and stop loss levels.

## 💼 Accounting System

### Keypair Management via Privy
Each pod member has their own individual keypair securely managed through Privy, ensuring personal custody and control over their wallet.

### Proposal Creation & Contribution
When a new trading proposal is created (such as a swap or opening a liquidity position), members can choose to contribute funds to participate in that specific trade.

### Wallet Balance Verification
Before accepting contributions, the bot automatically checks each member's wallet balance to ensure they have sufficient SOL to cover their intended contribution amount.

### Insufficient Funds Notification
If a member's wallet lacks sufficient funds, the bot immediately sends them a private direct message with clear instructions on how much SOL they need to add and how to fund their wallet.

### Transfer to Secure Vault
Once a member has adequate funds and approves the proposal, their contribution amount is automatically transferred from their personal wallet to the pod's secure escrow vault (Program Derived Address/PDA).

### Trade Execution from Vault
All approved trades are executed directly from the collective vault, ensuring that funds are pooled securely and trades happen atomically when the voting threshold is met.

### Position Closing & Reward Distribution
When a liquidity position is closed or a trade is settled, the profits (or losses) are automatically calculated and distributed to members proportionally based on their individual contribution amounts to that specific LP or swap.

### Accurate Profit Tracking
The smart contract maintains a precise ledger of each member's deposits and their corresponding share of realized profits, ensuring fair and transparent distribution.

### Private Key Export Process
When a member wants to export their private key and exit the pod, the system first converts all their tokens and positions to SOL to simplify withdrawal.

### Final Withdrawal
After conversion, the member receives their full balance (original contributions plus proportional profits) directly to their wallet, and they can then export their private key if desired.

### Indexing for Auto-Copy LP
Our advanced indexing system tracks and analyzes the liquidity provision strategies of top-performing traders in real-time. When you identify a trader whose strategy you want to replicate, our indexer automatically monitors their positions, entry/exit points, and rebalancing decisions. The pod can then vote to mirror these exact trades, allowing you to benefit from proven strategies without manual analysis. This feature enables pods to trade like the best performers by leveraging our comprehensive on-chain data indexing infrastructure.

## 🏗️ Architecture


<img width="1113" height="755" alt="Screenshot from 2025-10-31 09-19-02" src="https://github.com/user-attachments/assets/73da158f-4f88-434f-90d1-afabd13ffec1" />

## ❌ Problems We Solve

When a group of people (a "pod," an investment club, or just friends) try to trade together, they immediately hit four massive roadblocks.

### Problem 1: The Trust & Custody Nightmare (The "Key-Man" Risk)
This is the single biggest problem. How do you pool the funds?

- **The "Solution":** Everyone sends their money to one "trusted" person.
- **The Reality:** That one person now has 100% control. They could be a scammer and "rug" the group (an "exit scam"). They could get hacked. They could simply be a bad trader and lose everyone's money ("fat-fingering" a trade). Everyone else has zero control and zero security.

### Problem 2: The Coordination & Execution Mess (Herding Cats)
How does the group decide *what* to do and *when*?

- **The "Solution":** A messy group chat (Telegram, Discord, etc.) with polls and "I agree" messages.
- **The Reality:** By the time everyone agrees, the market opportunity is gone. It's slow, chaotic, and inefficient. Who actually clicks the "buy" button? How do you *prove* a consensus was met before the trade?

### Problem 3: The Accounting & P&L Headache (The Spreadsheet Nightmare)
How do you track who owns what?

- **The "Solution":** A complicated, manually-updated Google Sheet.
- **The Reality:** Alice put in 1.5 SOL, Bob put in 3 SOL, and Chara put in 0.5 SOL. The pod makes a 2 SOL profit. How is it split? Manually calculating P&L, contributions, and ownership shares is a nightmare, prone to errors and disputes.

### Problem 4: The Transparency Void (The "Black Box")
How does everyone *know* what's *really* happening?

- **The "Solution":** Trusting screenshots from the person holding the funds.
- **The Reality:** Screenshots can be faked. The fund manager can hide losses, lie about trades, or front-run the group's decisions. There is no single, verifiable source of truth, which leads to suspicion and conflict.

## ✅ How Alpha Pods Solves It

The `alpha_pods` smart contract, combined with the Telegram bot, provides a powerful and elegant solution to every single one of these problems.

### Solution to Trust & Custody: The Smart Contract Vault (PDA)
The bot doesn't hold any funds. The **Solana program** does. The funds live in a **Program Derived Address (PDA)**, which is a vault controlled *only* by code.

**How it saves people:** No single person can steal the money. To move *any* funds, a transaction *must* be signed by the `threshold` number of members. The bot just *proposes* the transaction; the members' wallets *authorize* it. This is **non-custodial** and removes all "key-man" risk.

### Solution to Coordination: The Telegram Bot as a UI
The bot turns the chaotic group chat into an efficient command center. This is the "gamified" part of the "gamified hedge fund."

**How it saves people:**
1. A member types: `/propose_trade buy 100_jup`
2. The bot instantly sends a message to the group: "Trade Proposed! Buy 100 JUP. Signatures: 0 / 3" with "Approve" and "Reject" buttons.
3. Members tap "Approve" (which, behind the scenes, signs a transaction with their wallet).
4. When the bot collects 3 signatures (the `threshold`), it automatically executes the trade through the smart contract.

This is fast, clean, and turns coordination into a simple, clear "game" workflow.

### Solution to Accounting: The Smart Contract as the Ledger
The spreadsheet is dead. The smart contract is now the accountant.

**How it saves people:** The `Pod` account struct in the `state.rs` file stores the `members` and their contributions. The PDA *is* the ledger. It knows exactly what assets it holds and who deposited what. P&L is calculated **on-chain**, instantly and accurately.

### Solution to Transparency: The Blockchain as the Source of Truth
No one has to trust screenshots ever again.

**How it saves people:** Anyone can take the `Pod`'s PDA address, paste it into a Solana explorer (like Solscan), and see **everything**: every asset it holds, every trade it has ever made, and its current value. It is **100% transparent and auditable by anyone, at any time.** The bot simply reads this public on-chain data and presents it nicely in the Telegram chat.

## 📝 Summary

**Alpha Pods** is a Telegram-based collaborative trading platform built on Solana that enables groups of traders to pool funds and make investment decisions together through secure, transparent, and democratic processes.

### Core Problem Being Solved

Traditional group trading suffers from four critical issues:

- **Trust Risk:** One person controls all pooled funds, creating potential for scams, hacks, or mismanagement
- **Coordination Chaos:** Group decisions through chat are slow and inefficient, missing market opportunities
- **Accounting Nightmares:** Manual tracking of contributions and profits leads to errors and disputes
- **Zero Transparency:** No verifiable way to confirm trades or holdings; relies on trusting screenshots

### Our Solution

Alpha Pods solves all four problems through:

- **Non-custodial smart contract vaults** that require multi-signature approval
- **Telegram bot interface** that gamifies coordination and makes voting seamless
- **On-chain accounting** that automatically tracks contributions and distributes profits
- **100% transparent blockchain records** that anyone can verify at any time

## 🔗 Links

- **Contract Address:** `FeozaXSwZZexg48Fup4xLZFN2c9nUsSvtHbWz3V3GQuq`
- **Explorer:** [View on Solana Explorer](https://explorer.solana.com/address/FeozaXSwZZexg48Fup4xLZFN2c9nUsSvtHbWz3V3GQuq?cluster=devnet)
- **Telegram Bot:** [@Alpha_Pods_bot](https://t.me/Alpha_Pods_bot)

---

**Built on Solana | Powered by Community Governance | Non-Custodial & Transparent**

