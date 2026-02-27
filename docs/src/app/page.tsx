export default function Page() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        AlphaPods Governance Platform
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Welcome to AlphaPods – a decentralized governance platform for managing DeFi strategies, treasury decisions, and protocol upgrades. Get started with the AlphaPods Telegram bot in three steps.
      </p>

      <h2 className="mt-8 text-base font-semibold">Step 1: Open the bot</h2>
      <p className="mt-2 text-sm text-slate-300">
        In Telegram, search for the AlphaPods bot (or open the link your DAO
        shared). Start a chat and tap <strong>Start</strong> or send{" "}
        <code>/start</code>.
      </p>
      <p className="mt-2 text-sm text-slate-300">
        The bot will create your account and link a Solana wallet for you. You
        use this wallet to deposit, propose, and vote—no need to connect a
        separate wallet in Telegram.
      </p>

      <h2 className="mt-8 text-base font-semibold">Step 2: See DAOs and subscribe</h2>
      <p className="mt-2 text-sm text-slate-300">
        Send <code>/realms</code> to see all DAOs (realms) the bot knows about.
        You’ll see each DAO’s name, network, and whether you’re following it.
      </p>
      <p className="mt-2 text-sm text-slate-300">
        To get alerts for a DAO, send:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
        <code>/subscribe &lt;realm_pubkey&gt;</code>
      </pre>
      <p className="mt-2 text-sm text-slate-300">
        Optionally add a minimum USD amount so you only get notified for
        proposals above that size. Use <code>/alerts</code> to turn alerts on or
        off per DAO with buttons.
      </p>

      <h2 className="mt-8 text-base font-semibold">Step 3: Vote on proposals</h2>
      <p className="mt-2 text-sm text-slate-300">
        Send <code>/gov_vote</code>. The bot will list recent proposals. Reply
        with the <strong>number</strong> of the proposal you want to vote on,
        then reply with <code>yes</code> or <code>no</code>, then paste the
        community token mint when asked. Your vote is sent on-chain from your
        linked wallet.
      </p>
      <p className="mt-2 text-sm text-slate-300">
        To deposit voting power first (if your DAO requires it), use{" "}
        <code>/deposit_power</code> in a private chat with the bot and follow
        the steps.
      </p>

      <h2 className="mt-8 text-base font-semibold">What you can do next</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
        <li>
          <strong>Admins:</strong> Create a DAO with <code>/createdao</code>,
          then set rules and treasury with <code>/setup_governance</code>.
        </li>
        <li>
          <strong>Create a proposal:</strong> Use <code>/gov_propose</code> and
          follow the wizard (realm, governance, mint, title, description).
        </li>
        <li>
          <strong>Delegates:</strong> See top delegates with{" "}
          <code>/delegates &lt;realm_pubkey&gt;</code> and delegate your vote
          with <code>/delegate_to &lt;realm_pubkey&gt; &lt;delegate_wallet&gt;</code>.
        </li>
      </ul>
      <p className="mt-4 text-sm text-slate-400">
        For full command list and details, see the sidebar: <strong>Guides</strong> and{" "}
        <strong>Reference → Telegram Command Reference</strong>.
      </p>
    </div>
  );
}
