export default function Page() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">API Reference</h1>
      <p className="mt-2 text-sm text-slate-400">
        The bot’s backend exposes a few read-only HTTP endpoints. These are
        used by the web dashboard to show realms, proposals, and delegates.
        Most users only need the Telegram bot; this page is for reference if
        you use or host the dashboard.
      </p>

      <h2 className="mt-8 text-base font-semibold">Base URL</h2>
      <p className="mt-2 text-sm text-slate-300">
        When the backend is running, the base URL is typically{" "}
        <code>http://localhost:4000</code> (or your deployed URL). The dashboard
        is served at the root; APIs are under <code>/api</code>.
      </p>

      <h2 className="mt-8 text-base font-semibold">Endpoints</h2>
      <ul className="mt-2 space-y-4 text-sm text-slate-300">
        <li>
          <code>GET /api/realms</code> — Returns all realms in the database.
          Response: array of objects with <code>id</code>, <code>pubkey</code>,{" "}
          <code>name</code>, <code>cluster</code>.
        </li>
        <li>
          <code>GET /api/realms/:pubkey/proposals</code> — Returns the realm and
          its proposals. <code>:pubkey</code> is the realm’s public key.
          Response: <code>{`{ realm, proposals }`}</code>.
        </li>
        <li>
          <code>GET /api/realms/:pubkey/delegates</code> — Returns the realm and
          top delegates (with stats). Response:{" "}
          <code>{`{ realm, delegates }`}</code> where each delegate entry
          includes delegate profile and stats.
        </li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Web dashboard</h2>
      <p className="mt-2 text-sm text-slate-300">
        Opening the backend root (e.g. <code>http://localhost:4000/</code>)
        loads a read-only dashboard that lists realms and, when you select one,
        shows its proposals and delegates. No authentication is required; it
        uses the APIs above. All actions (create DAO, vote, subscribe, etc.)
        are done via the Telegram bot.
      </p>
    </div>
  );
}
