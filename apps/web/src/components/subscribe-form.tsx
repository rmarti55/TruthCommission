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
    <form onSubmit={onSubmit} className="mt-5 flex flex-wrap gap-3">
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="transition-base min-w-[220px] flex-1 rounded-sm border border-border bg-canvas px-4 py-2 font-sans text-sm text-text placeholder:text-muted"
      />
      <button
        type="submit"
        disabled={loading}
        className="transition-base rounded-sm border border-border-strong bg-surface px-4 py-2 font-sans text-sm font-medium text-text hover:bg-surface-muted disabled:opacity-50"
      >
        {loading ? "Sending…" : "Get alerts"}
      </button>
      {status ? (
        <p className="w-full font-sans text-sm text-muted">{status}</p>
      ) : null}
    </form>
  );
}
