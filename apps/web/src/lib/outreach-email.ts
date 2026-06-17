import { Resend } from "resend";

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendOutreachEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (!resend) {
    console.info("[outreach] RESEND_API_KEY not set; would send to:", params.to);
    console.info("[outreach] Subject:", params.subject);
    console.info("[outreach] Body:", params.body);
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      text: params.body,
    });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const OUTREACH_TEMPLATE = `Hello,

New materials related to the New Mexico Survivors' Truth Commission have been published on the independent Truth Commission Tracker.

Visit the archive for subpoenas, meeting transcripts, and official documents:

{{APP_URL}}

This is a one-time outreach from an independent civic archive — not affiliated with the NM Legislature or the Truth Commission.

Thank you,
Truth Commission Tracker`;

export function fillOutreachTemplate(appUrl: string): string {
  return OUTREACH_TEMPLATE.replace("{{APP_URL}}", appUrl);
}
