import Link from "next/link";
import { ListCard } from "@/components/ui/list-card";
import { PageLayout } from "@/components/ui/page-layout";
import { SubPageHeader } from "@/components/ui/sub-page-header";
import { getCommissionMembers } from "@truth-commission/ingest";

export const dynamic = "force-dynamic";

export default function CommitteePage() {
  const { intro, sourceUrl, members } = getCommissionMembers();

  return (
    <PageLayout
      header={
        <SubPageHeader
          breadcrumb={{ href: "/", label: "NM Truth Commission Tracker" }}
          title="Commission members"
          backHref="/"
          backLabel="Home"
        />
      }
      footer={
        <p className="mt-20 pb-12 font-sans text-xs leading-relaxed text-muted">
          Member roster sourced from the official commission site. This tracker is
          independent — not affiliated with the NM Legislature or the Truth Commission.
        </p>
      }
    >
      <main className="py-10 md:py-12">
        <section className="panel max-w-prose">
          <p className="prose-block">{intro}</p>
          <p className="mt-4 font-sans text-sm leading-relaxed text-muted">
            Primary source:{" "}
            <Link href={sourceUrl} className="text-link" target="_blank" rel="noreferrer">
              nmtruthcommission.com — About the Commission
            </Link>
          </p>
        </section>

        <section className="mt-12">
          <h2 className="mb-4 text-lg tracking-[-0.015em]">
            Commissioners ({members.length})
          </h2>
          <ol className="space-y-4">
            {members.map((member) => (
              <ListCard
                key={member.id}
                eyebrow={
                  member.role === "Chair"
                    ? `${member.role} · ${member.locationLabel}`
                    : member.locationLabel
                }
                title={member.name}
                meta={
                  <p className="mt-1 font-sans text-sm text-muted">
                    <a href={`mailto:${member.email}`} className="text-link">
                      {member.email}
                    </a>
                    <span className="mx-2 text-border-strong">·</span>
                    {member.district}
                  </p>
                }
                detail={member.bio}
              />
            ))}
          </ol>
        </section>
      </main>
    </PageLayout>
  );
}
