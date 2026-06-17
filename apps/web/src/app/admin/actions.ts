"use server";

import { redirect } from "next/navigation";
import {
  contactEmails,
  contacts,
  organizations,
  outreachSends,
  type Database,
} from "@truth-commission/db";
import { crawlOrganization } from "@truth-commission/ingest";
import { getStakeholderOrganizations } from "@truth-commission/ingest";
import { eq, inArray } from "drizzle-orm";
import {
  clearAdminSession,
  isAdminAuthenticated,
  setAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { fillOutreachTemplate, sendOutreachEmail } from "@/lib/outreach-email";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}

function requireDb(): Database {
  const db = getDb();
  if (!db) throw new Error("Database not configured");
  return db;
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!verifyAdminPassword(password)) {
    redirect("/admin/login?error=invalid");
  }
  await setAdminSession();
  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function updateEmailStatusAction(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as
    | "discovered"
    | "pending_review"
    | "approved"
    | "rejected";
  const adminNotes = String(formData.get("adminNotes") ?? "") || undefined;

  if (!id || !["discovered", "pending_review", "approved", "rejected"].includes(status)) {
    throw new Error("Invalid input");
  }

  await db
    .update(contactEmails)
    .set({
      status,
      adminNotes,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contactEmails.id, id));

  redirect(`/admin/contacts/${id}`);
}

export async function recrawlOrganizationAction(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const externalId = String(formData.get("externalId") ?? "");
  const seed = getStakeholderOrganizations().find((org) => org.id === externalId);
  if (!seed) throw new Error("Organization seed not found");

  await crawlOrganization(db, seed);
  redirect("/admin/organizations?recrawled=1");
}

export async function sendOutreachAction(formData: FormData) {
  await requireAdmin();
  const db = requireDb();

  const subject =
    String(formData.get("subject") ?? "").trim() ||
    "New Truth Commission materials published";
  const body =
    String(formData.get("body") ?? "").trim() ||
    fillOutreachTemplate(env.appUrl());
  const selected = formData.getAll("emailIds").map(String).filter(Boolean);

  if (selected.length === 0) {
    redirect("/admin/outreach/new?error=no-recipients");
  }

  const rows = await db
    .select({
      id: contactEmails.id,
      email: contactEmails.email,
      contactId: contactEmails.contactId,
      status: contactEmails.status,
    })
    .from(contactEmails)
    .where(inArray(contactEmails.id, selected));

  const approved = rows.filter((row) => row.status === "approved");

  for (const row of approved) {
    const result = await sendOutreachEmail({
      to: row.email,
      subject,
      body,
    });

    await db.insert(outreachSends).values({
      contactEmailId: row.id,
      email: row.email,
      subject,
      body,
      success: result.sent,
      errorMessage: result.error,
    });

    if (result.sent) {
      await db
        .update(contacts)
        .set({ contactedAt: new Date(), updatedAt: new Date() })
        .where(eq(contacts.id, row.contactId));
    }
  }

  redirect("/admin/outreach?sent=1");
}

export async function markPendingReviewAction(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const id = String(formData.get("id") ?? "");

  await db
    .update(contactEmails)
    .set({ status: "pending_review", updatedAt: new Date() })
    .where(eq(contactEmails.id, id));

  redirect(`/admin/contacts/${id}`);
}

export async function updateOrganizationNotesAction(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("notes") ?? "");

  await db
    .update(organizations)
    .set({ notes, updatedAt: new Date() })
    .where(eq(organizations.id, id));

  redirect("/admin/organizations");
}
