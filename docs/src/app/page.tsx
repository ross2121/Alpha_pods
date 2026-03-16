import Link from "next/link";
import WaitlistForm from "./waitlist-form";

const capabilityColumns = [
  {
    title: "Pool capital with clear rules",
    text: "Create pods that collect member funds, check balances, move approved deposits into a Solana escrow vault, and execute strategy votes from a shared treasury.",
  },
  {
    title: "Run governance where your community already lives",
    text: "Create DAOs, configure governance, deposit voting power, open proposals, and cast votes from Telegram using SPL Governance / Realms on Solana.",
  },
  {
    title: "Track the signal, not the noise",
    text: "Subscribe to proposal alerts, authority changes, and minimum-value filters so members only see high-signal governance and treasury events.",
  },
];

const productAreas = [
  "Telegram bot flows for DAO creation, proposal voting, subscriptions, delegates, and treasury actions.",
  "Privy-backed wallet management so members can sign from Telegram without browser-extension friction.",
  "Meteora strategy execution for swaps, LP positions, custom ranges, take profit, and stop loss logic.",
  "Indexer and poller services for governance webhooks, proposal updates, and smart alert delivery.",
  "Read-only dashboard and docs so communities can monitor realms, delegates, and proposal history.",
  "Accounting logic to track member contributions, vault transfers, and proportional distribution on settlement.",
];

const waitlistFit = [
  "Telegram-native trading pods coordinating multiple members",
  "DAO operators who want Realms governance without forcing users into browser wallets",
  "Crypto communities that need treasury execution plus alerts, delegates, and proposal workflows",
];

const rollout = [
  "Closed beta: curated onboarding for pods running on devnet and testing treasury workflows",
  "Operational beta: expanded support for live governance alerts, delegate surfaces, and dashboard visibility",
  "General rollout: more self-serve setup, richer analytics, and broader strategy automation",
];

const faq = [
  {
    question: "What exactly is AlphaPods?",
    answer:
      "AlphaPods is a Telegram-based platform for collaborative trading and DAO governance on Solana. It combines pooled treasury workflows, SPL Governance / Realms actions, alerts, delegates, and strategy execution.",
  },
  {
    question: "Is this a wallet or a bot?",
    answer:
      "It is primarily a Telegram bot product with managed wallets behind it. Members get a Privy-backed Solana wallet linked to their Telegram identity so voting and treasury actions can happen inside Telegram.",
  },
  {
    question: "What is available today?",
    answer:
      "The current product includes bot commands for DAO creation, governance setup, deposits, proposals, voting, alerts, delegates, wallet management, and shared trading workflows. The public rollout is still staged, which is why the homepage is now a waitlist.",
  },
];

export default function Page() {
  return (
    <div className="landing-shell">
      <div className="landing-background" />

      <header className="landing-topbar">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/logo.svg"
            alt="AlphaPods logo"
            className="h-11 w-11 rounded-[1.1rem]"
          />
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">
              AlphaPods
            </div>
            <div className="text-xs text-slate-500">
              Telegram-native Solana coordination
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/docs" className="landing-button-secondary">
            View docs
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-6 sm:px-8">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="pt-8">
            <div className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-emerald-200">
              Waitlist open for Solana pods and DAO operators
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              Run trading pods, treasury actions, and on-chain governance
              directly from Telegram.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              AlphaPods turns Telegram groups into operational surfaces for
              pooled capital, DeFi strategy execution, SPL Governance / Realms
              workflows, delegate discovery, and smart alerts on Solana.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#waitlist" className="landing-button">
                Join the waitlist
              </a>
              <Link href="/docs" className="landing-button-secondary">
                Explore the docs
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="landing-stat">
                <span className="landing-stat-label">Governance</span>
                <strong>DAOs, proposals, votes, delegates</strong>
              </div>
              <div className="landing-stat">
                <span className="landing-stat-label">Trading</span>
                <strong>Vaults, swaps, LP positions, strategies</strong>
              </div>
              <div className="landing-stat">
                <span className="landing-stat-label">Ops</span>
                <strong>Alerts, indexers, dashboards, accounting</strong>
              </div>
            </div>
          </div>

          <div id="waitlist" className="lg:pt-2">
            <WaitlistForm />
          </div>
        </section>

        <section className="mt-20 grid gap-5 md:grid-cols-3">
          {capabilityColumns.map((item) => (
            <article key={item.title} className="landing-panel">
              <h2 className="text-xl font-semibold tracking-tight text-white">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {item.text}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-20 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="landing-panel">
            <div className="landing-eyebrow">Why teams join</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              AlphaPods compresses the coordination stack.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-300">
              Most communities split governance, treasury management, trading
              operations, and alerts across disconnected tools. AlphaPods pulls
              those workflows into Telegram while keeping governance state and
              treasury logic anchored on Solana.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
                <div className="landing-mini-title">For pod operators</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Coordinate proposals, contributions, and execution without
                  chasing members across multiple apps.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
                <div className="landing-mini-title">For DAO communities</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Give contributors a faster path to vote, subscribe, delegate,
                  and monitor high-value proposals.
                </p>
              </div>
            </div>
          </div>

          <div className="landing-panel landing-grid-panel">
            <div>
              <div className="landing-eyebrow">Built into the product</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                The current stack already spans governance, execution, and data.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {productAreas.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.5rem] border border-white/8 bg-slate-950/70 p-4 text-sm leading-6 text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div className="landing-panel">
            <div className="landing-eyebrow">How it works</div>
            <div className="mt-6 space-y-5">
              <div className="landing-timeline-item">
                <span>1</span>
                <div>
                  <h3>Invite the bot and create a pod or DAO</h3>
                  <p>
                    Start in Telegram, register members, connect managed wallets,
                    and create the operating context for trading or governance.
                  </p>
                </div>
              </div>
              <div className="landing-timeline-item">
                <span>2</span>
                <div>
                  <h3>Set rules for treasury and governance</h3>
                  <p>
                    Configure proposals, voting thresholds, native treasury
                    controls, alert filters, and delegate workflows around a
                    shared operating model.
                  </p>
                </div>
              </div>
              <div className="landing-timeline-item">
                <span>3</span>
                <div>
                  <h3>Execute strategies from a shared vault</h3>
                  <p>
                    Members contribute capital, approved trades execute from the
                    vault, and realized outcomes are tracked back to each member.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="landing-panel">
            <div className="landing-eyebrow">Best fit right now</div>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
              {waitlistFit.map((item) => (
                <li key={item} className="landing-list-item">
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-[1.75rem] border border-cyan-400/20 bg-cyan-400/8 p-5">
              <div className="landing-mini-title">Beta status</div>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                The bot is currently deployed on devnet. The waitlist is for
                teams that want early access, product feedback loops, and staged
                onboarding as the rollout expands.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <div className="landing-panel">
            <div className="landing-eyebrow">Rollout</div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {rollout.map((item, index) => (
                <div
                  key={item}
                  className="rounded-[1.75rem] border border-white/8 bg-slate-950/60 p-5"
                >
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Phase 0{index + 1}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="landing-panel">
            <div className="landing-eyebrow">FAQ</div>
            <div className="mt-6 space-y-4">
              {faq.map((item) => (
                <article
                  key={item.question}
                  className="rounded-[1.5rem] border border-white/8 bg-slate-950/65 p-5"
                >
                  <h3 className="text-lg font-medium text-white">
                    {item.question}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    {item.answer}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="landing-panel landing-panel-strong">
            <div className="landing-eyebrow">Need the deeper technical view?</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              The docs already cover the operating model.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              If you want command references, governance architecture, alerts,
              or delegate workflows before joining the waitlist, the existing
              documentation is still live.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/docs" className="landing-button">
                Open docs
              </Link>
              <a
                href="https://github.com/youval-singh/alphadpods"
                className="landing-button-secondary"
              >
                View repository
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
