import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AlphaPods Docs",
  description: "Documentation for the AlphaPods Telegram governance bot and dashboard",
};

const nav = [
  {
    section: "Introduction",
    items: [
      { href: "/", label: "Quickstart Guide" },
      { href: "/overview", label: "Overview" },
    ],
  },
  {
    section: "Guides",
    items: [
      { href: "/guides/telegram-governance", label: "Telegram Governance" },
      { href: "/guides/alerts", label: "Alerts & Subscriptions" },
      { href: "/guides/delegates", label: "Delegates & Delegation" },
    ],
  },
  {
    section: "Reference",
    items: [
      { href: "/reference/commands", label: "Telegram Command Reference" },
      { href: "/reference/api", label: "API Reference" },
    ],
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <div className="flex h-full">
          {/* Sidebar */}
          <aside className="hidden w-64 flex-shrink-0 border-r border-slate-800 bg-slate-950 px-4 py-6 lg:block">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm font-semibold tracking-wide">
                AlphaPods
              </span>
            </div>

            <nav className="space-y-4 text-sm">
              {nav.map((group) => (
                <div key={group.section}>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {group.section}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block rounded-md px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main column */}
          <div className="flex min-h-screen flex-1 flex-col">
            {/* Top bar */}
            <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-3 backdrop-blur">
              <div className="text-sm font-medium">Tachyon · Governance Bot</div>
              <div className="w-64">
                <div className="flex items-center rounded-md border border-slate-700 bg-slate-900 px-2">
                  <span className="mr-2 text-xs text-slate-500">⌘K</span>
                  <input
                    placeholder="Search docs"
                    className="h-7 flex-1 border-none bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>
            </header>

            {/* Content */}
            <main className="mx-auto flex w-full max-w-4xl flex-1 px-6 py-8">
              <div className="w-full">{children}</div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}

