export default function Page() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">AlphaPods Governance Platform</h1>
      <p className="mt-2 text-sm text-slate-400">
        AlphaPods is a complete governance and delegation platform that lets you participate in Solana DAO governance (SPL Governance / Realms) directly from Telegram—no browser or wallet extension required.
      </p>

      <h2 className="mt-8 text-base font-semibold">What you can do</h2>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-300">
        <li>
          <strong>Create and join DAOs</strong> — Group admins can create a new
          Realm (DAO) from Telegram. Members can deposit governance tokens to
          get voting power.
        </li>
        <li>
          <strong>Propose and vote</strong> — Create on-chain proposals and cast
          Yes/No votes from the bot. The bot shows you a list of proposals so
          you don’t have to copy addresses.
        </li>
        <li>
          <strong>Get smart alerts</strong> — Subscribe to DAOs and choose what
          you’re notified about: e.g. only proposals above a certain USD value,
          or only upgrade-authority changes.
        </li>
        <li>
          <strong>Discover and follow delegates</strong> — See top delegates per
          DAO and delegate your voting power to someone you trust.
        </li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">How it works</h2>
      <p className="mt-2 text-sm text-slate-300">
        The bot uses a managed Solana wallet (via Privy) tied to your Telegram
        account. When you run commands like <code>/deposit_power</code>,{" "}
        <code>/gov_propose</code>, or <code>/gov_vote</code>, the bot builds the
        transaction and signs it with your wallet—you confirm in Telegram. All
        governance state lives on Solana (SPL Governance / Realms); the bot and
        its database only help you discover proposals, get alerts, and vote
        without leaving Telegram.
      </p>

      <h2 className="mt-8 text-base font-semibold">Where to use the bot</h2>
      <p className="mt-2 text-sm text-slate-300">
        Use the bot in <strong>private chat</strong> for things like voting,
        depositing, and managing alerts. Some commands (e.g. <code>/createdao</code>)
        are intended for <strong>group admins</strong> in the DAO’s Telegram
        group. If a command doesn’t respond in a group, try the same command in
        a direct message with the bot.
      </p>
    </div>
  );
}
