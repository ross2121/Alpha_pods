export default function Page() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Telegram Governance
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        How to create a DAO, get voting power, create proposals, and vote—all
        from Telegram.
      </p>

      <h2 className="mt-8 text-base font-semibold">Create a DAO (admins)</h2>
      <p className="mt-2 text-sm text-slate-300">
        In your DAO group, as an admin, send <code>/createdao</code>. The bot
        will ask for: realm name, community token mint, and optional council
        mint (type <code>none</code> to skip). Your linked wallet is the realm
        authority and pays the transaction. The new realm is saved and appears in
        /realms and the web dashboard.
      </p>

      <h2 className="mt-8 text-base font-semibold">Deposit voting power</h2>
      <p className="mt-2 text-sm text-slate-300">
        In a private chat, send <code>/deposit_power</code>. Provide realm
        address, community mint, and amount (in smallest units). You need that
        token in your linked wallet. After that you can propose and vote in that
        realm.
      </p>

      <h2 className="mt-8 text-base font-semibold">Set up governance (admins)</h2>
      <p className="mt-2 text-sm text-slate-300">
        Run <code>/setup_governance</code>. Enter realm, community mint, and
        minimum tokens to create a proposal. The bot creates the Governance
        account and the DAO’s native SOL treasury. If the treasury already
        exists, it skips that step.
      </p>

      <h2 className="mt-8 text-base font-semibold">Create a proposal</h2>
      <p className="mt-2 text-sm text-slate-300">
        Send <code>/gov_propose</code> and follow the wizard: realm, governance,
        mint, then title and optional description. Your wallet must have enough
        deposited power in that realm.
      </p>

      <h2 className="mt-8 text-base font-semibold">Vote on a proposal</h2>
      <p className="mt-2 text-sm text-slate-300">
        Send <code>/gov_vote</code>. The bot lists recent proposals. Reply with
        the proposal number, then <code>yes</code> or <code>no</code>, then the
        community mint. The vote is sent on-chain from your wallet.
      </p>
    </div>
  );
}
