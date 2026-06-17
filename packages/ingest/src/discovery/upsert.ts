import {
  contactEmails,
  contacts,
  organizations,
  type Database,
  type EmailProvenanceEntry,
  type emailSourceTypeEnum,
  type organizationCategoryEnum,
} from "@truth-commission/db";
import { and, eq, isNull } from "drizzle-orm";
import { findOrgByName, getStakeholderOrgById, normalizeOrgName } from "../stakeholders";

export type DiscoveredEmailInput = {
  email: string;
  sourceType: (typeof emailSourceTypeEnum.enumValues)[number];
  sourceUrl?: string;
  artifactId?: string;
  snippet?: string;
  confidence?: number;
  contactName?: string;
  contactTitle?: string;
  organizationId?: string;
  organizationName?: string;
  organizationExternalId?: string;
};

export type UpsertEmailResult = {
  email: string;
  action: "created" | "updated" | "skipped";
  contactEmailId?: string;
};

async function findOrCreateOrganization(
  db: Database,
  input: DiscoveredEmailInput,
): Promise<string | null> {
  if (input.organizationId) {
    const existing = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, input.organizationId))
      .limit(1);
    if (existing[0]) return existing[0].id;
  }

  let seed = input.organizationExternalId
    ? getStakeholderOrgById(input.organizationExternalId)
    : undefined;
  if (!seed && input.organizationName) {
    seed = findOrgByName(input.organizationName);
  }

  if (seed) {
    const byExternal = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.externalId, seed.id))
      .limit(1);
    if (byExternal[0]) return byExternal[0].id;

    const [created] = await db
      .insert(organizations)
      .values({
        externalId: seed.id,
        name: seed.name,
        category: seed.category as (typeof organizationCategoryEnum.enumValues)[number],
        website: seed.website ?? undefined,
        aliases: seed.aliases ?? [],
        notes: "notes" in seed ? (seed.notes as string | undefined) : undefined,
      })
      .returning({ id: organizations.id });
    return created.id;
  }

  if (!input.organizationName) return null;

  const normalized = normalizeOrgName(input.organizationName);
  const allOrgs = await db.select().from(organizations);
  const match = allOrgs.find((org) => {
    if (normalizeOrgName(org.name) === normalized) return true;
    const aliases = (org.aliases as string[] | null) ?? [];
    return aliases.some((alias) => normalizeOrgName(alias) === normalized);
  });
  if (match) return match.id;

  const [created] = await db
    .insert(organizations)
    .values({
      name: input.organizationName,
      category: "other",
    })
    .returning({ id: organizations.id });
  return created.id;
}

async function findOrCreateContact(
  db: Database,
  organizationId: string | null,
  input: DiscoveredEmailInput,
): Promise<string> {
  const name = input.contactName?.trim() || "General Contact";

  if (organizationId) {
    const [match] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.organizationId, organizationId), eq(contacts.name, name)))
      .limit(1);
    if (match) return match.id;
  } else {
    const [match] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.name, name), isNull(contacts.organizationId)))
      .limit(1);
    if (match) return match.id;
  }

  const [created] = await db
    .insert(contacts)
    .values({
      organizationId: organizationId ?? undefined,
      name,
      title: input.contactTitle,
    })
    .returning({ id: contacts.id });
  return created.id;
}

function buildProvenanceEntry(input: DiscoveredEmailInput): EmailProvenanceEntry {
  return {
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl,
    artifactId: input.artifactId,
    snippet: input.snippet,
    confidence: input.confidence,
    discoveredAt: new Date().toISOString(),
  };
}

export async function upsertDiscoveredEmail(
  db: Database,
  input: DiscoveredEmailInput,
): Promise<UpsertEmailResult> {
  const email = input.email.toLowerCase().trim();
  if (!email.includes("@")) {
    return { email, action: "skipped" };
  }

  const organizationId = await findOrCreateOrganization(db, input);
  const contactId = await findOrCreateContact(db, organizationId, input);
  const provenanceEntry = buildProvenanceEntry(input);
  const confidence = input.confidence ?? 50;

  const existing = await db
    .select()
    .from(contactEmails)
    .where(eq(contactEmails.email, email))
    .limit(1);

  if (existing[0]) {
    const row = existing[0];
    const provenance = (row.provenance as EmailProvenanceEntry[] | null) ?? [];
    const mergedProvenance = [...provenance, provenanceEntry];
    const newConfidence = Math.max(row.confidence, confidence);

    await db
      .update(contactEmails)
      .set({
        confidence: newConfidence,
        provenance: mergedProvenance,
        snippet: row.snippet ?? input.snippet,
        sourceUrl: row.sourceUrl ?? input.sourceUrl,
        artifactId: row.artifactId ?? input.artifactId ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(contactEmails.id, row.id));

    return { email, action: "updated", contactEmailId: row.id };
  }

  const [created] = await db
    .insert(contactEmails)
    .values({
      contactId,
      email,
      status: "discovered",
      confidence,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl,
      artifactId: input.artifactId,
      snippet: input.snippet,
      provenance: [provenanceEntry],
    })
    .returning({ id: contactEmails.id });

  return { email, action: "created", contactEmailId: created.id };
}

export async function seedOrganizationsFromManifest(db: Database): Promise<number> {
  const { getStakeholderOrganizations } = await import("../stakeholders");
  let created = 0;

  for (const seed of getStakeholderOrganizations()) {
    const existing = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.externalId, seed.id))
      .limit(1);

    if (existing[0]) continue;

    await db.insert(organizations).values({
      externalId: seed.id,
      name: seed.name,
      category: seed.category as (typeof organizationCategoryEnum.enumValues)[number],
      website: seed.website ?? undefined,
      aliases: seed.aliases ?? [],
      notes: "notes" in seed ? (seed.notes as string | undefined) : undefined,
    });
    created += 1;
  }

  return created;
}
