export default function Page() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Telegram Command Reference
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        All bot commands and what they do. Use these in a private chat with the
        bot unless noted.
      </p>

      <h2 className="mt-8 text-base font-semibold">Getting started</h2>
      <ul className="mt-2 space-y-3 text-sm text-slate-300">
        <li>
          <code>/start</code> — Register and link your wallet. Do this first in
          a private chat.
        </li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Governance (Realms)</h2>
      <ul className="mt-2 space-y-3 text-sm text-slate-300">
        <li>
          <code>/createdao</code> — Create a new Realm (DAO) on-chain. For
          group admins; run in the group or in DM.
        </li>
        <li>
          <code>/deposit_power</code> — Deposit governance tokens to get voting
          power in a realm. Wizard: realm, community mint, amount (raw units).
        </li>
        <li>
          <code>/setup_governance</code> — Create Governance config and native
          SOL treasury for a realm. For admins. Wizard: realm, mint, min tokens
          to propose.
        </li>
        <li>
          <code>/gov_propose</code> — Create an on-chain proposal. Wizard:
          realm, governance, mint, title, description.
        </li>
        <li>
          <code>/gov_vote</code> — Vote on a proposal. Bot lists proposals;
          you reply with number, then yes/no, then mint.
        </li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Alerts & subscriptions</h2>
      <ul className="mt-2 space-y-3 text-sm text-slate-300">
        <li>
          <code>/realms</code> — List all indexed realms and your follow status.
        </li>
        <li>
          <code>/subscribe &lt;realm_pubkey&gt; [min_usd]</code> — Subscribe to
          alerts for a realm. Optional min_usd filters by proposal size.
        </li>
        <li>
          <code>/unsubscribe &lt;realm_pubkey&gt;</code> — Stop alerts for a
          realm.
        </li>
        <li>
          <code>/set_alert_min &lt;realm_pubkey&gt; &lt;usd|none&gt;</code> —
          Set or clear minimum USD filter for a realm.
        </li>
        <li>
          <code>/authority_alert &lt;realm_pubkey&gt; on|off</code> — Toggle
          upgrade-authority-change alerts for a realm.
        </li>
        <li>
          <code>/alerts</code> — Show subscription status and use buttons to
          enable/disable alerts per realm.
        </li>
        <li>
          <code>/test_alerts</code> — Trigger a test notification flow (useful
          to confirm alerts work).
        </li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Delegates</h2>
      <ul className="mt-2 space-y-3 text-sm text-slate-300">
        <li>
          <code>/delegates &lt;realm_pubkey&gt;</code> — List top delegates for
          a realm (votes, participation).
        </li>
        <li>
          <code>/delegate_to &lt;realm_pubkey&gt; &lt;delegate_wallet&gt;</code>{" "}
          — Set your delegation for that realm to the given wallet.
        </li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Other</h2>
      <ul className="mt-2 space-y-3 text-sm text-slate-300">
        <li>
          <code>/cancel</code> — Exit the current wizard and reset.
        </li>
        <li>
          <code>/wallet</code> — Manage wallet (view, withdraw, export). Use in
          private chat only.
        </li>
      </ul>
    </div>
  );
}
