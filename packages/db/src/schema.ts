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

export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalId: text("external_id").notNull().unique(),
  title: text("title").notNull(),
  meetingDate: timestamp("meeting_date", { withTimezone: true }),
  harmonyEventId: text("harmony_event_id"),
  streamUrl: text("stream_url"),
  status: text("status"),
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

export type Meeting = typeof meetings.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
export type CaptionSegment = typeof captionSegments.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
export type PollRun = typeof pollRuns.$inferSelect;
