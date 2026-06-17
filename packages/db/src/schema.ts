import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const artifactTypeEnum = pgEnum("artifact_type", [
  "subpoena",
  "memo",
  "agenda",
  "handout",
  "press_release",
  "meeting_transcript",
  "report",
  "presentation",
]);

export const artifactStatusEnum = pgEnum("artifact_status", [
  "discovered",
  "ingested",
  "processed",
  "published",
]);

export const sensitivityEnum = pgEnum("sensitivity", [
  "public",
  "survivor_testimony",
]);

export const subscriberStatusEnum = pgEnum("subscriber_status", [
  "pending",
  "active",
  "unsubscribed",
]);

export const organizationCategoryEnum = pgEnum("organization_category", [
  "subpoena_recipient",
  "legislature",
  "commission",
  "federal_agency",
  "advocacy",
  "media",
  "legal",
  "other",
]);

export const contactEmailStatusEnum = pgEnum("contact_email_status", [
  "discovered",
  "pending_review",
  "approved",
  "rejected",
]);

export const emailSourceTypeEnum = pgEnum("email_source_type", [
  "document_text",
  "html_mailto",
  "web_page",
  "directory",
  "manual",
  "llm_extract",
]);

export type MeetingMetadata = {
  format?: string;
  startTime?: string;
  zoomUrl?: string;
  handoutsListUrl?: string;
  agendaUrl?: string;
  sourceNotes?: string;
};

export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalId: text("external_id").notNull().unique(),
  title: text("title").notNull(),
  meetingDate: timestamp("meeting_date", { withTimezone: true }),
  harmonyEventId: text("harmony_event_id"),
  streamUrl: text("stream_url"),
  status: text("status"),
  metadata: jsonb("metadata").$type<MeetingMetadata>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const artifacts = pgTable(
  "artifacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: artifactTypeEnum("type").notNull(),
    status: artifactStatusEnum("status").notNull().default("discovered"),
    sensitivity: sensitivityEnum("sensitivity").notNull().default("public"),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    sourceUrl: text("source_url").notNull(),
    blobUrl: text("blob_url"),
    contentHash: text("content_hash").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    fullText: text("full_text"),
    summaryShort: text("summary_short"),
    summaryLong: text("summary_long"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    meetingId: uuid("meeting_id").references(() => meetings.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("artifacts_type_idx").on(table.type),
    index("artifacts_published_at_idx").on(table.publishedAt),
    index("artifacts_content_hash_idx").on(table.contentHash),
  ],
);

export const captionSegments = pgTable(
  "caption_segments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artifactId: uuid("artifact_id")
      .notNull()
      .references(() => artifacts.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    beginAt: timestamp("begin_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    content: text("content").notNull(),
  },
  (table) => [
    index("caption_segments_artifact_idx").on(table.artifactId),
    index("caption_segments_begin_idx").on(table.beginAt),
  ],
);

export const subscribers = pgTable(
  "subscribers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    status: subscriberStatusEnum("status").notNull().default("pending"),
    instantAlerts: boolean("instant_alerts").notNull().default(true),
    weeklyDigest: boolean("weekly_digest").notNull().default(false),
    confirmToken: text("confirm_token"),
    unsubscribeToken: text("unsubscribe_token").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("subscribers_status_idx").on(table.status)],
);

export const pollRuns = pgTable("poll_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: text("source").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  success: boolean("success"),
  newArtifacts: integer("new_artifacts").default(0),
  details: jsonb("details").$type<Record<string, unknown>>().default({}),
});

export const siteContent = pgTable("site_content", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    externalId: text("external_id").unique(),
    name: text("name").notNull(),
    category: organizationCategoryEnum("category").notNull().default("other"),
    website: text("website"),
    aliases: jsonb("aliases").$type<string[]>().default([]),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("organizations_category_idx").on(table.category),
    index("organizations_name_idx").on(table.name),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    title: text("title"),
    roleType: text("role_type"),
    notes: text("notes"),
    contactedAt: timestamp("contacted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("contacts_organization_idx").on(table.organizationId),
    index("contacts_name_idx").on(table.name),
  ],
);

export type EmailProvenanceEntry = {
  sourceType: (typeof emailSourceTypeEnum.enumValues)[number];
  sourceUrl?: string;
  artifactId?: string;
  snippet?: string;
  confidence?: number;
  discoveredAt: string;
};

export const contactEmails = pgTable(
  "contact_emails",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    status: contactEmailStatusEnum("status").notNull().default("discovered"),
    confidence: integer("confidence").notNull().default(50),
    sourceType: emailSourceTypeEnum("source_type").notNull(),
    sourceUrl: text("source_url"),
    artifactId: uuid("artifact_id").references(() => artifacts.id, {
      onDelete: "set null",
    }),
    snippet: text("snippet"),
    provenance: jsonb("provenance").$type<EmailProvenanceEntry[]>().default([]),
    adminNotes: text("admin_notes"),
    discoveredAt: timestamp("discovered_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("contact_emails_status_idx").on(table.status),
    index("contact_emails_contact_idx").on(table.contactId),
    index("contact_emails_artifact_idx").on(table.artifactId),
  ],
);

export const outreachSends = pgTable(
  "outreach_sends",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contactEmailId: uuid("contact_email_id").references(() => contactEmails.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
    success: boolean("success").notNull().default(true),
    errorMessage: text("error_message"),
  },
  (table) => [
    index("outreach_sends_sent_at_idx").on(table.sentAt),
    index("outreach_sends_contact_email_idx").on(table.contactEmailId),
  ],
);

export const discoveryRuns = pgTable("discovery_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  success: boolean("success"),
  details: jsonb("details").$type<Record<string, unknown>>().default({}),
});

export type Meeting = typeof meetings.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
export type CaptionSegment = typeof captionSegments.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
export type PollRun = typeof pollRuns.$inferSelect;
export type SiteContent = typeof siteContent.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type ContactEmail = typeof contactEmails.$inferSelect;
export type OutreachSend = typeof outreachSends.$inferSelect;
export type DiscoveryRun = typeof discoveryRuns.$inferSelect;
