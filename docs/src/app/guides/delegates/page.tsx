export default function Page() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Delegates & Delegation
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Discover trusted delegates, build your reputation as a delegate, and delegate your voting power within AlphaPods.
      </p>

      <h2 className="mt-8 text-base font-semibold">What is a Delegate?</h2>
      <p className="mt-2 text-sm text-slate-300">
        A <strong>delegate</strong> is a community member who votes on governance proposals on behalf of token holders. Instead of voting yourself every time, you can:
      </p>
      <ul className="mt-3 space-y-1 pl-5 text-sm text-slate-300 list-disc">
        <li>Delegate your voting power to someone you trust</li>
        <li>They vote on your behalf automatically</li>
        <li>You keep your tokens; they just count your vote</li>
      </ul>

      <p className="mt-3 text-sm text-slate-300">
        <strong>Why delegate?</strong>
      </p>
      <ul className="mt-3 space-y-1 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>Time:</strong> Don't have time to research every proposal? Someone else does.</li>
        <li><strong>Expertise:</strong> Delegate to someone with deep protocol knowledge.</li>
        <li><strong>Alignment:</strong> Pick someone whose values match yours (e.g., "more conservative", "builder-friendly").</li>
        <li><strong>Consistency:</strong> They're incentivized to vote well and build reputation.</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Discovering Delegates</h2>
      <p className="mt-2 text-sm text-slate-300">
        Use the <code>/delegates</code> command to see top delegates in a realm:
      </p>

      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
        <code>/delegates &lt;realm_pubkey&gt;</code>
      </pre>

      <p className="mt-3 text-sm text-slate-300">
        The bot shows a list of delegates sorted by:
      </p>
      <ul className="mt-3 space-y-1 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>Voting power:</strong> Total tokens controlled (their own + delegated)</li>
        <li><strong>Participation rate:</strong> % of proposals they voted on</li>
        <li><strong>Tags:</strong> Categories they focus on (e.g., "risk-averse", "DeFi-expert")</li>
      </ul>

      <h3 className="mt-4 text-sm font-semibold">Delegate Card</h3>
      <p className="mt-2 text-sm text-slate-300">
        Each delegate card shows:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{` 👤 Name: Alice
 📊 Voting Power: 1.5M tokens
 📈 Participation: 95% (19/20 proposals)
 🏷️ Tags: [Conservative, Treasury-Focused]
 ⭐ Alignment Score: 0.82
 
 [View Profile] [Delegate to Alice]`}
      </pre>

      <p className="mt-3 text-sm text-slate-300">
        <strong>Alignment Score:</strong> How often did they vote with "successful" proposals vs "defeated" ones. Higher = more aligned with past community sentiment.
      </p>

      <h2 className="mt-8 text-base font-semibold">Delegating Your Voting Power</h2>
      <p className="mt-2 text-sm text-slate-300">
        Once you've chosen a delegate, delegate to them:
      </p>

      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
        <code>/delegate_to &lt;realm_pubkey&gt; &lt;delegate_wallet&gt;</code>
      </pre>

      <p className="mt-3 text-sm text-slate-300">
        This creates a delegation record on-chain that:
      </p>
      <ul className="mt-3 space-y-1 pl-5 text-sm text-slate-300 list-disc">
        <li>Links your voting power to their wallet</li>
        <li>Only applies in that specific realm</li>
        <li>Increases their total voting power</li>
        <li>Can be revoked anytime</li>
      </ul>

      <h3 className="mt-4 text-sm font-semibold">What Happens When You Delegate</h3>
      <p className="mt-2 text-sm text-slate-300">
        After delegation:
      </p>
      <ol className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-decimal">
        <li>Your tokens still stay in your wallet</li>
        <li>Your voting power is added to the delegate's total</li>
        <li>When they vote, your votes count toward their vote</li>
        <li>You can revoke delegation and vote yourself anytime</li>
      </ol>

      <h3 className="mt-4 text-sm font-semibold">Revoke Delegation</h3>
      <p className="mt-2 text-sm text-slate-300">
        If your delegate stops voting or you disagree with their direction, revoke delegation:
      </p>

      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
        <code>/revoke_delegation &lt;realm_pubkey&gt;</code>
      </pre>

      <p className="mt-3 text-sm text-slate-300">
        Your voting power is now yours again, and votes going forward are up to you.
      </p>

      <h2 className="mt-8 text-base font-semibold">Becoming a Delegate (Reputation Building)</h2>
      <p className="mt-2 text-sm text-slate-300">
        If you want to become a trusted delegate and gain followers, here's the path:
      </p>

      <h3 className="mt-4 text-sm font-semibold">Step 1: Create Your Delegate Profile</h3>
      <p className="mt-2 text-sm text-slate-300">
        First, set up a profile so people can find and trust you. Visit the AlphaPods dashboard or send:
      </p>

      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
        <code>/my_profile</code>
      </pre>

      <p className="mt-3 text-sm text-slate-300">
        Fill in:
      </p>
      <ul className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>Display Name:</strong> "Alice" or "Alice Capital"</li>
        <li><strong>Bio:</strong> "DeFi researcher, focus on capital efficiency and risk management."</li>
        <li><strong>Avatar URL:</strong> Profile picture (hosted on IPFS or CDN)</li>
        <li><strong>Tags:</strong> Pick 2-3 that describe your voting philosophy</li>
        <li><strong>Contact:</strong> Telegram/Discord handle for discussions</li>
      </ul>

      <h3 className="mt-4 text-sm font-semibold">Available Tags</h3>
      <ul className="mt-3 space-y-1 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>Conservative:</strong> Low-risk proposals, prefer tested strategies</li>
        <li><strong>Aggressive:</strong> Open to experimental, high-risk high-reward ideas</li>
        <li><strong>Builder-Aligned:</strong> Votes to support builders and dev teams</li>
        <li><strong>Treasury-Focused:</strong> Prioritizes efficient capital management</li>
        <li><strong>Transparency:</strong> Demands detailed documentation and communication</li>
        <li><strong>Governance-Expert:</strong> Deep knowledge of mechanics and risks</li>
      </ul>

      <h3 className="mt-4 text-sm font-semibold">Step 2: Start Voting Consistently</h3>
      <p className="mt-2 text-sm text-slate-300">
        Vote on proposals in realms where you have voting power:
      </p>
      <ol className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-decimal">
        <li>Use <code>/deposit_power</code> in realms you want to be active in</li>
        <li>Use <code>/gov_vote</code> to vote on proposals</li>
        <li>Write down your reasoning (in forum posts or Discord)</li>
        <li>Respond to questions about your votes</li>
      </ol>

      <p className="mt-3 text-sm text-slate-300">
        <strong>Consistency matters:</strong> People want delegates who show up, not just for big votes but for all proposals.
      </p>

      <h3 className="mt-4 text-sm font-semibold">Step 3: Build Trust & Transparency</h3>
      <p className="mt-2 text-sm text-slate-300">
        Great delegates:
      </p>
      <ul className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>Explain votes:</strong> Write brief summaries of why they voted a certain way</li>
        <li><strong>Engage community:</strong> Respond to questions and feedback</li>
        <li><strong>Stay aligned:</strong> Consistent with stated philosophy (if you say you're conservative, don't random yolo)</li>
        <li><strong>Share research:</strong> Link to discussions, articles, or analyses</li>
      </ul>

      <h3 className="mt-4 text-sm font-semibold">Step 4: Track Your Progress</h3>
      <p className="mt-2 text-sm text-slate-300">
        View your delegate stats:
      </p>

      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
        <code>/my_stats &lt;realm_pubkey&gt;</code>
      </pre>

      <p className="mt-3 text-sm text-slate-300">
        This shows:
      </p>
      <ul className="mt-3 space-y-1 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>Voting power:</strong> Your tokens + delegated to you</li>
        <li><strong>Participation:</strong> Votes cast / total proposals (%)</li>
        <li><strong>Alignment:</strong> Voting history vs successful proposals</li>
        <li><strong>Followers:</strong> How many people delegated to you</li>
        <li><strong>Recent votes:</strong> Last 10 proposals you voted on</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Delegate Economics (Incentives)</h2>
      <p className="mt-2 text-sm text-slate-300">
        <strong>Current model:</strong> Delegation is purely reputational. Delegates don't earn a "fee" from voting delegation itself.
      </p>

      <p className="mt-3 text-sm text-slate-300">
        <strong>Future incentives (possible):</strong>
      </p>
      <ul className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>Grants:</strong> High-reputation delegates might receive DAO grants</li>
        <li><strong>Delegation rewards:</strong> Optional fee paid by delegators to delegates (opt-in)</li>
        <li><strong>Badges & Recognition:</strong> On-chain badges for consistent delegates (verifiable on-chain)</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Delegate Best Practices</h2>
      <h3 className="mt-4 text-sm font-semibold">For Delegators (You, voting through someone)</h3>
      <ul className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>Diversify:</strong> Don't delegate all your power to one person. Spread across 2-3 delegates with different philosophies.</li>
        <li><strong>Monitor:</strong> Check their recent votes periodically. If you disagree, revoke.</li>
        <li><strong>Engage fallback:</strong> Have fallback to voting yourself on critical proposals.</li>
        <li><strong>Rotate:</strong> Try different delegates, see who aligns best with you.</li>
      </ul>

      <h3 className="mt-4 text-sm font-semibold">For Delegates (Building Reputation)</h3>
      <ul className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>Be consistent:</strong> Your voting philosophy should be clear and stable.</li>
        <li><strong>Respond to feedback:</strong> If delegators question a vote, explain your reasoning.</li>
        <li><strong>Set expectations:</strong> State upfront: "I vote on all proposals" vs "I focus on treasury/security only".</li>
        <li><strong>Disclose conflicts:</strong> If you have a stake in the outcome (or personally DAO member), be transparent.</li>
        <li><strong>Improve communication:</strong> Write voting summaries, engage on Discord/Twitter.</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Delegate Reputation Metrics</h2>
      <p className="mt-2 text-sm text-slate-300">
        The AlphaPods indexer computes these stats for each delegate:
      </p>

      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`{
  delegate_address: Pubkey,
  realm_address: Pubkey,
  
  // Basic stats
  total_voting_power: u64,        // Tokens they own + delegated to them
  num_followers: u32,             // How many people delegated to them
  
  // Voting behavior
  total_votes_cast: u32,
  total_proposals_eligible: u32,  // Proposals where they had power
  participation_rate: f64,        // votes_cast / eligible (%)
  
  // Alignment / quality
  yes_votes: u32,
  no_votes: u32,
  yes_success_rate: f64,  // % of yes votes on proposals that passed
  no_success_rate: f64,   // % of no votes on proposals that failed
  alignment_score: f64,   // 0-1, higher = more aligned with community
  
  // Recent activity
  last_vote: Timestamp,
  
  // Metadata
  display_name: String,
  bio: String,
  avatar_url: String,
  tags: Vec<String>,
}`}
      </pre>

      <h2 className="mt-8 text-base font-semibold">Common Questions</h2>

      <h3 className="mt-4 text-sm font-semibold">Q: If I delegate, can I still vote?</h3>
      <p className="mt-2 text-sm text-slate-300">
        Yes! You can vote on specific proposals even after delegating. Your vote counts, plus the delegate's vote on the same proposal also counts (weighted by their power). This is rare but possible.
      </p>

      <h3 className="mt-4 text-sm font-semibold">Q: What if my delegate goes inactive?</h3>
      <p className="mt-2 text-sm text-slate-300">
        You'll notice their participation rate drops. You can revoke your delegation and pick someone more active. The AlphaPods bot will also notify you if your delegate hasn't voted in a while (via `/alerts`).
      </p>

      <h3 className="mt-4 text-sm font-semibold">Q: Can I delegate to multiple delegates?</h3>
      <p className="mt-2 text-sm text-slate-300">
        Not currently – you can only delegate your full voting power to one wallet per realm. If you want to diversify, you'd need to split your tokens manually across wallets, then delegate each separately. This might be a future feature.
      </p>

      <h3 className="mt-4 text-sm font-semibold">Q: Can a delegate vote for themselves?</h3>
      <p className="mt-2 text-sm text-slate-300">
        Yes. Delegates are just wallets with voting power. If they own tokens in a realm, they vote with their own power + delegated power combined.
      </p>

      <h2 className="mt-8 text-base font-semibold">Next Steps</h2>
      <ul className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>As a voter:</strong> Use <code>/delegates &lt;realm_pubkey&gt;</code> to find your first delegate.</li>
        <li><strong>As a potential delegate:</strong> Set up your profile and start voting consistently in realms you care about.</li>
        <li><strong>For dashboards:</strong> Check the AlphaPods web dashboard to see delegate profiles and reputation scores.</li>
      </ul>

      <p className="mt-6 text-sm text-slate-400">
        <strong>See also:</strong> <strong>Telegram Governance</strong> for command walkthroughs, or <strong>Smart Alerts</strong> to stay updated on delegates you follow.
      </p>
    </div>
  );
}
