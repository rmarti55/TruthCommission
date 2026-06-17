import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { artifacts } from "@truth-commission/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ArtifactDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();
  if (!db) notFound();

  const [artifact] = await db
    .select()
    .from(artifacts)
    .where(eq(artifacts.slug, slug))
    .limit(1);

  if (!artifact) notFound();

  const metadata = (artifact.metadata ?? {}) as Record<string, unknown>;
  const recipient = String(metadata.recipient ?? artifact.title);
  const complianceDeadline = String(metadata.complianceDeadline ?? "");
  const issuedDate = String(metadata.issuedDate ?? "");
  const requestedRecordTypes = Array.isArray(metadata.requestedRecordTypes)
    ? (metadata.requestedRecordTypes as string[])
    : [];
  const pdfUrl = String(metadata.cdnUrl ?? artifact.blobUrl ?? artifact.sourceUrl);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <div>
            <Link href="/artifacts" className="text-xs uppercase tracking-[0.2em] text-amber-400/80">
              Archive
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{recipient}</h1>
          </div>
          <Link href="/artifacts" className="text-sm text-stone-400 hover:text-stone-200">
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <dl className="grid gap-4 rounded-2xl border border-stone-800 bg-stone-900/40 p-6 sm:grid-cols-2">
          {issuedDate ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-stone-500">Issued</dt>
              <dd className="mt-1 text-stone-200">{issuedDate}</dd>
            </div>
          ) : null}
          {complianceDeadline ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-stone-500">Compliance deadline</dt>
              <dd className="mt-1 text-stone-200">{complianceDeadline}</dd>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-stone-500">Original PDF</dt>
            <dd className="mt-1">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-amber-300 underline underline-offset-4 hover:text-amber-200"
              >
                View source document
              </a>
            </dd>
          </div>
        </dl>

        {artifact.summaryLong ? (
          <section className="mt-8">
            <h2 className="text-lg font-medium">Summary</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-300">
              {artifact.summaryLong}
            </p>
          </section>
        ) : null}

        {requestedRecordTypes.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-lg font-medium">Requested record types</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-300">
              {requestedRecordTypes.map((type) => (
                <li key={type}>{type}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {artifact.fullText ? (
          <details className="mt-8 rounded-2xl border border-stone-800 bg-stone-900/30 p-6">
            <summary className="cursor-pointer text-lg font-medium text-stone-100">
              Full extracted text
            </summary>
            <pre className="mt-4 max-h-[32rem] overflow-auto whitespace-pre-wrap text-xs leading-6 text-stone-400">
              {artifact.fullText}
            </pre>
          </details>
        ) : null}
      </main>
    </div>
  );
}
