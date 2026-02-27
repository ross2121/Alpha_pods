export default function Page() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Smart Alerts & Notifications
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Configure intelligent notifications so you only hear about proposals that matter to you.
      </p>

      <h2 className="mt-8 text-base font-semibold">Overview</h2>
      <p className="mt-2 text-sm text-slate-300">
        AlphaPods can send you notifications for governance events, but you control exactly what you're notified about. Instead of being spammed with every proposal, filter for:
      </p>
      <ul className="mt-3 space-y-1 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>By amount:</strong> Only proposals over a certain USD impact</li>
        <li><strong>By type:</strong> Only treasury changes, upgrades, config updates, etc.</li>
        <li><strong>By delegate:</strong> Alert me if my trusted delegate hasn't voted yet</li>
        <li><strong>Frequency:</strong> Instant pings or daily digest</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Setting Up Alerts</h2>
      <p className="mt-2 text-sm text-slate-300">
        Use the <code>/alerts</code> command to view and configure your notification settings:
      </p>

      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
        <code>/alerts</code>
      </pre>

      <p className="mt-3 text-sm text-slate-300">
        The bot will show your current subscriptions with inline buttons to adjust each setting.
      </p>

      <h2 className="mt-8 text-base font-semibold">Quick Start</h2>
      <ol className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-decimal">
        <li><strong>Find realms:</strong> Send <code>/realms</code> to see all DAOs</li>
        <li><strong>Subscribe:</strong> Send <code>/subscribe &lt;realm_pubkey&gt;</code></li>
        <li><strong>Configure:</strong> Send <code>/alerts</code> to adjust filters and frequency</li>
      </ol>

      <h2 className="mt-8 text-base font-semibold">Configurable Filters</h2>

      <h3 className="mt-4 text-sm font-semibold">1. USD Threshold</h3>
      <p className="mt-2 text-sm text-slate-300">
        Set a minimum proposal impact (in USD) to be notified:
      </p>
      <ul className="mt-3 space-y-1 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>$0:</strong> Notify me of every proposal</li>
        <li><strong>$10,000:</strong> Only proposals over 10K (medium impact)</li>
        <li><strong>$100,000:</strong> Only big proposals (major treasury moves)</li>
      </ul>

      <p className="mt-3 text-sm text-slate-300">
        Use the command:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
        <code>/set_alert_min &lt;realm_pubkey&gt; &lt;usd_amount&gt;</code>
      </pre>

      <h3 className="mt-4 text-sm font-semibold">2. Proposal Type Filters</h3>
      <p className="mt-2 text-sm text-slate-300">
        Choose which types of proposals to be notified about:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-300">
        <li>
          <strong>✅ New Proposals:</strong> Alert me when a new proposal is created<br/>
          <span className="text-xs text-slate-400">(Usually default ON)</span>
        </li>
        <li>
          <strong>💰 Treasury Changes:</strong> Proposals that move funds above threshold<br/>
          <span className="text-xs text-slate-400">(Transfers, distributions, treasury swaps)</span>
        </li>
        <li>
          <strong>🔧 Parameter Updates:</strong> Changes to governance config (fees, voting time, etc.)<br/>
          <span className="text-xs text-slate-400">(Example: "Increase fee from 5% to 7%")</span>
        </li>
        <li>
          <strong>⚡ Upgrade Authority:</strong> Proposals that change upgrade authority<br/>
          <span className="text-xs text-slate-400">(HIGH RISK – usually important to track)</span>
        </li>
        <li>
          <strong>🎯 Program Updates:</strong> Proposals to upgrade the program itself<br/>
          <span className="text-xs text-slate-400">(Smart contract deployments)</span>
        </li>
      </ul>

      <p className="mt-3 text-sm text-slate-300">
        Toggle authority change alerts:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
        <code>/authority_alert &lt;realm_pubkey&gt; on|off</code>
      </pre>

      <h3 className="mt-4 text-sm font-semibold">3. Notification Frequency</h3>
      <p className="mt-2 text-sm text-slate-300">
        Choose how you want to receive notifications:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-300">
        <li>
          <strong>🔔 Instant:</strong> Get a DM as soon as a proposal is created<br/>
          <span className="text-xs text-slate-400">(Might feel spammy if many proposals)</span>
        </li>
        <li>
          <strong>📰 Digest (Daily):</strong> Get one message per day with all new proposals<br/>
          <span className="text-xs text-slate-400">(Less intrusive, better for low-frequency DAOs)</span>
        </li>
        <li>
          <strong>🔕 Off:</strong> Don't notify me for this realm
        </li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Example Notification</h2>
      <p className="mt-2 text-sm text-slate-300">
        Here's what you'll get when a proposal matches your filters:
      </p>

      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`🗳️ **New Proposal: AlphaPods DAO**

📌 **Title:** Increase Treasury by 50K USDC

💰 **Impact:** $50,000 USD

⏱️ **Voting:** 3 days remaining

[View Details] [Vote Now] [Open in Realms]`}
      </pre>

      <h2 className="mt-8 text-base font-semibold">Pro Tips</h2>
      <ul className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>Use digest mode for many DAOs:</strong> If you follow 5+ realms, digest mode prevents notification fatigue.</li>
        <li><strong>Set high thresholds for conservative DAOs:</strong> If a DAO makes small, frequent proposals, only notify for big ones.</li>
        <li><strong>Always enable upgrade alerts:</strong> Even small DAOs occasionally update—upgrades are risky!</li>
        <li><strong>Check /alerts regularly:</strong> All proposals are indexed; you can browse history anytime.</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Troubleshooting</h2>
      <ul className="mt-3 space-y-2 pl-5 text-sm text-slate-300">
        <li><strong>Not getting notifications?</strong> Check <code>/alerts</code> – your frequency might be set to "off", or USD threshold too high.</li>
        <li><strong>Too many notifications?</strong> Try digest mode or increase your USD threshold.</li>
        <li><strong>Missing DMs?</strong> Open DMs with the bot.</li>
      </ul>

      <p className="mt-6 text-sm text-slate-400">
        <strong>See also:</strong> <strong>Telegram Governance</strong> for all commands, or <strong>Delegates & Delegation</strong> for tracking delegate activity.
      </p>
    </div>
  );
}
