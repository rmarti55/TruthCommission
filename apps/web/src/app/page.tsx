import Link from "next/link";
import { loadSources } from "@truth-commission/ingest";

export default function HomePage() {
  const sources = loadSources();

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
            Block B scaffold
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6">
          <h2 className="text-lg font-medium text-stone-100">Status</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
            Monorepo scaffold is live. Source recon is loaded from{" "}
            <code className="rounded bg-stone-800 px-1.5 py-0.5 text-amber-200">recon/sources.json</code>.
            Next up: ingest the 6 June subpoenas and publish the archive.
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat label="Subpoenas cataloged" value={String(sources.summary.subpoenasFound)} />
            <Stat label="Meetings mapped" value={String(sources.summary.meetingsCataloged)} />
            <Stat label="Harmony events validated" value={String(sources.summary.harmonyEventsValidated)} />
          </dl>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <Card
            title="Recent Subpoenas"
            href="https://www.nmtruthcommission.com/subpoena"
            detail={`${sources.subpoenas.items.length} PDFs ready to ingest`}
          />
          <Card
            title="Meetings & archives"
            href="https://www.nmtruthcommission.com/meetingsandarchives"
            detail="Harmony transcripts via GetClosedCaption API"
          />
          <Card
            title="nmlegis HISC"
            href={sources.sites.nmlegisHisc.committeePage}
            detail="Agendas, handouts, official schedule"
          />
          <Card title="Health check" href="/api/health" detail="Service + env status JSON" />
        </section>

        <p className="mt-10 text-xs text-stone-500">
          Not affiliated with the NM Legislature or the Truth Commission. Primary sources linked on every artifact page (coming in Block C).
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
