"use client";

import { FormEvent, useState } from "react";

type FormState = {
  email: string;
  telegram: string;
  team: string;
};

const initialState: FormState = {
  email: "",
  telegram: "",
  team: "2-10",
};

export default function WaitlistForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");

    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem("alphapods-waitlist");
      const entries = raw ? JSON.parse(raw) : [];

      entries.push({
        ...form,
        createdAt: new Date().toISOString(),
      });

      window.localStorage.setItem("alphapods-waitlist", JSON.stringify(entries));
    }

    setSubmitted(true);
    setForm(initialState);
  }

  return (
    <div className="landing-panel landing-panel-strong">
      <div className="flex items-center gap-3">
        <div className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-200">
          Early Access
        </div>
        <div className="text-xs text-slate-400">Devnet product, curated onboarding</div>
      </div>

      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">
        Join the AlphaPods waitlist
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        We&apos;re onboarding trading pods, DAO operators, and crypto communities
        that want Telegram-native governance with pooled strategy execution.
      </p>

      {submitted ? (
        <div className="mt-6 rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          You&apos;re on the list. We&apos;ll use your email for rollout updates and
          beta access.
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              Work email
            </span>
            <input
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              type="email"
              placeholder="team@dao.io"
              className="landing-input"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              Telegram handle
            </span>
            <input
              value={form.telegram}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  telegram: event.target.value,
                }))
              }
              type="text"
              placeholder="@yourgroupadmin"
              className="landing-input"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              Pod size
            </span>
            <select
              value={form.team}
              onChange={(event) =>
                setForm((current) => ({ ...current, team: event.target.value }))
              }
              className="landing-input"
            >
              <option>2-10</option>
              <option>11-50</option>
              <option>51-250</option>
              <option>250+</option>
            </select>
          </label>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button type="submit" className="landing-button w-full">
            Request beta access
          </button>
        </form>
      )}

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Current beta focus: Solana communities that need proposal workflows,
        shared treasury controls, smart alerts, and pooled DeFi execution.
      </p>
    </div>
  );
}
