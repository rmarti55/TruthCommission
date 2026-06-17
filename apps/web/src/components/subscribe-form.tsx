"use client";

import { FormEvent, useState } from "react";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { message?: string; error?: string };
      setStatus(data.message ?? data.error ?? "Subscription request sent");
      if (response.ok) setEmail("");
    } catch {
      setStatus("Could not submit subscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-wrap gap-3">
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="min-w-[220px] flex-1 rounded-xl border border-stone-700 bg-stone-950 px-4 py-2 text-sm text-stone-100 placeholder:text-stone-500"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl border border-amber-500/40 px-4 py-2 text-sm font-medium text-amber-200 disabled:opacity-50"
      >
        {loading ? "Sending..." : "Get alerts"}
      </button>
      {status ? <p className="w-full text-sm text-stone-400">{status}</p> : null}
    </form>
  );
}
