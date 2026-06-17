CREATE TYPE "public"."organization_category" AS ENUM('subpoena_recipient', 'legislature', 'commission', 'federal_agency', 'advocacy', 'media', 'legal', 'other');
CREATE TYPE "public"."contact_email_status" AS ENUM('discovered', 'pending_review', 'approved', 'rejected');
CREATE TYPE "public"."email_source_type" AS ENUM('document_text', 'html_mailto', 'web_page', 'directory', 'manual', 'llm_extract');

CREATE TABLE "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "external_id" text,
  "name" text NOT NULL,
  "category" "organization_category" DEFAULT 'other' NOT NULL,
  "website" text,
  "aliases" jsonb DEFAULT '[]'::jsonb,
  "notes" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "organizations_external_id_unique" UNIQUE("external_id")
);

CREATE TABLE "contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "name" text NOT NULL,
  "title" text,
  "role_type" text,
  "notes" text,
  "contacted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action
);

CREATE TABLE "contact_emails" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "contact_id" uuid NOT NULL,
  "email" text NOT NULL,
  "status" "contact_email_status" DEFAULT 'discovered' NOT NULL,
  "confidence" integer DEFAULT 50 NOT NULL,
  "source_type" "email_source_type" NOT NULL,
  "source_url" text,
  "artifact_id" uuid,
  "snippet" text,
  "provenance" jsonb DEFAULT '[]'::jsonb,
  "admin_notes" text,
  "discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "contact_emails_email_unique" UNIQUE("email"),
  CONSTRAINT "contact_emails_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "contact_emails_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE set null ON UPDATE no action
);

CREATE TABLE "outreach_sends" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "contact_email_id" uuid,
  "email" text NOT NULL,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "sent_at" timestamp with time zone DEFAULT now() NOT NULL,
  "success" boolean DEFAULT true NOT NULL,
  "error_message" text,
  CONSTRAINT "outreach_sends_contact_email_id_contact_emails_id_fk" FOREIGN KEY ("contact_email_id") REFERENCES "public"."contact_emails"("id") ON DELETE set null ON UPDATE no action
);

CREATE TABLE "discovery_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "finished_at" timestamp with time zone,
  "success" boolean,
  "details" jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX "organizations_category_idx" ON "organizations" USING btree ("category");
CREATE INDEX "organizations_name_idx" ON "organizations" USING btree ("name");
CREATE INDEX "contacts_organization_idx" ON "contacts" USING btree ("organization_id");
CREATE INDEX "contacts_name_idx" ON "contacts" USING btree ("name");
CREATE INDEX "contact_emails_status_idx" ON "contact_emails" USING btree ("status");
CREATE INDEX "contact_emails_contact_idx" ON "contact_emails" USING btree ("contact_id");
CREATE INDEX "contact_emails_artifact_idx" ON "contact_emails" USING btree ("artifact_id");
CREATE INDEX "outreach_sends_sent_at_idx" ON "outreach_sends" USING btree ("sent_at");
CREATE INDEX "outreach_sends_contact_email_idx" ON "outreach_sends" USING btree ("contact_email_id");
