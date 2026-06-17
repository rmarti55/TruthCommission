-- Initial schema for NM Truth Commission Tracker

CREATE TYPE "public"."artifact_type" AS ENUM('subpoena', 'memo', 'agenda', 'handout', 'press_release', 'meeting_transcript', 'report', 'presentation');
CREATE TYPE "public"."artifact_status" AS ENUM('discovered', 'ingested', 'processed', 'published');
CREATE TYPE "public"."sensitivity" AS ENUM('public', 'survivor_testimony');
CREATE TYPE "public"."subscriber_status" AS ENUM('pending', 'active', 'unsubscribed');

CREATE TABLE "meetings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "external_id" text NOT NULL,
  "title" text NOT NULL,
  "meeting_date" timestamp with time zone,
  "harmony_event_id" text,
  "stream_url" text,
  "status" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "meetings_external_id_unique" UNIQUE("external_id")
);

CREATE TABLE "artifacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" "artifact_type" NOT NULL,
  "status" "artifact_status" DEFAULT 'discovered' NOT NULL,
  "sensitivity" "sensitivity" DEFAULT 'public' NOT NULL,
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "source_url" text NOT NULL,
  "blob_url" text,
  "content_hash" text NOT NULL,
  "published_at" timestamp with time zone,
  "full_text" text,
  "summary_short" text,
  "summary_long" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "meeting_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "artifacts_slug_unique" UNIQUE("slug"),
  CONSTRAINT "artifacts_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action
);

CREATE TABLE "caption_segments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "artifact_id" uuid NOT NULL,
  "sequence" integer NOT NULL,
  "begin_at" timestamp with time zone NOT NULL,
  "end_at" timestamp with time zone NOT NULL,
  "content" text NOT NULL,
  CONSTRAINT "caption_segments_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE "subscribers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "status" "subscriber_status" DEFAULT 'pending' NOT NULL,
  "instant_alerts" boolean DEFAULT true NOT NULL,
  "weekly_digest" boolean DEFAULT false NOT NULL,
  "confirm_token" text,
  "unsubscribe_token" text NOT NULL,
  "confirmed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);

CREATE TABLE "poll_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source" text NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "finished_at" timestamp with time zone,
  "success" boolean,
  "new_artifacts" integer DEFAULT 0,
  "details" jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX "artifacts_type_idx" ON "artifacts" USING btree ("type");
CREATE INDEX "artifacts_published_at_idx" ON "artifacts" USING btree ("published_at");
CREATE INDEX "artifacts_content_hash_idx" ON "artifacts" USING btree ("content_hash");
CREATE INDEX "caption_segments_artifact_idx" ON "caption_segments" USING btree ("artifact_id");
CREATE INDEX "caption_segments_begin_idx" ON "caption_segments" USING btree ("begin_at");
CREATE INDEX "subscribers_status_idx" ON "subscribers" USING btree ("status");
