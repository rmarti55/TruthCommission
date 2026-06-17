import Link from "next/link";
import { SubscribeForm } from "@/components/subscribe-form";
import { getDb } from "@/lib/db";
import { loadSources } from "@truth-commission/ingest";
import { artifacts } from "@truth-commission/db";
import { count, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ subscribe?: string }>;
}) {
  const sources = loadSources();
  const params = await searchParams;
  const db = getDb();

  const [publishedCount] = db
    ? await db
        .select({ value: count() })
        .from(artifacts)
        .where(eq(artifacts.status, "published"))
    : [{ value: 0 }];

  const [subpoenaCount] = db
    ? await db
        .select({ value: count() })
        .from(artifacts)
        .where(eq(artifacts.type, "subpoena"))
    : [{ value: 0 }];

  const subscribeMessage =
    params.subscribe === "confirmed"
      ? "Subscription confirmed. You will receive instant alerts."
      : params.subscribe === "unsubscribed"
        ? "You have been unsubscribed."
        : params.subscribe === "invalid-token"
          ? "That subscription link is invalid or expired."
          : null;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800 bg-stone-950/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-400/80">
              Independent civic tracker
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              NM Survivors&apos; Truth Commission
            </h1>
          </div>
          <span className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-400">
            Block C MVP
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6">
          <h2 className="text-lg font-medium text-stone-100">Status</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
            Live archive of June 2026 subpoenas with searchable summaries. Primary PDFs remain on{" "}
            <a
              href="https://www.nmtruthcommission.com/subpoena"
              className="text-amber-300 underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              nmtruthcommission.com
            </a>
            .
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat label="Published artifacts" value={String(publishedCount.value)} />
            <Stat label="Subpoenas ingested" value={String(subpoenaCount.value)} />
            <Stat
              label="Cataloged in recon"
              value={String(sources.summary.subpoenasFound)}
            />
          </dl>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <Card
            title="Subpoena archive"
            href="/artifacts?type=subpoena"
            detail={`${subpoenaCount.value} subpoenas searchable with summaries`}
          />
          <Card
            title="Recent Subpoenas (source)"
            href="https://www.nmtruthcommission.com/subpoena"
            detail="Official commission subpoena index"
          />
          <Card
            title="Meetings & archives"
            href="https://www.nmtruthcommission.com/meetingsandarchives"
            detail="Harmony transcripts via GetClosedCaption API"
          />
          <Card title="Health check" href="/api/health" detail="Service + database status JSON" />
        </section>

        <section className="mt-8 rounded-2xl border border-stone-800 bg-stone-900/40 p-6">
          <h2 className="text-lg font-medium">Email alerts</h2>
          <p className="mt-2 text-sm text-stone-400">
            Get an instant alert when a new subpoena or official material is published.
          </p>
          {subscribeMessage ? (
            <p className="mt-3 text-sm text-amber-200">{subscribeMessage}</p>
          ) : null}
          <SubscribeForm />
        </section>

        <p className="mt-10 text-xs text-stone-500">
          Not affiliated with the NM Legislature or the Truth Commission. Primary sources linked on every artifact page.
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950 p-4">
      <dt className="text-xs uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-2 text-3xl font-semibold text-amber-300">{value}</dd>
    </div>
  );
}

function Card({ title, href, detail }: { title: string; href: string; detail: string }) {
  const external = href.startsWith("http");
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="block rounded-2xl border border-stone-800 bg-stone-900/40 p-5 transition hover:border-amber-500/40 hover:bg-stone-900"
    >
      <h3 className="font-medium text-stone-100">{title}</h3>
      <p className="mt-2 text-sm text-stone-400">{detail}</p>
    </Link>
  );
}
