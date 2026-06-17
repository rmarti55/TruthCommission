import { Resend } from "resend";
import { env } from "./env";

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendSubscriberConfirmation(params: {
  email: string;
  confirmUrl: string;
}) {
  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (!resend) {
    console.info("[email] RESEND_API_KEY not set; confirmation link:", params.confirmUrl);
    return { sent: false as const, logged: true as const };
  }

  await resend.emails.send({
    from,
    to: params.email,
    subject: "Confirm your Truth Commission tracker subscription",
    text: `Confirm your subscription to NM Survivors' Truth Commission alerts:\n\n${params.confirmUrl}\n\nYou will receive instant alerts when new subpoenas and official materials are published.`,
  });

  return { sent: true as const };
}

export async function sendNewSubpoenaAlert(params: {
  email: string;
  recipient: string;
  complianceDeadline: string;
  summaryShort: string;
  artifactUrl: string;
  unsubscribeUrl: string;
}) {
  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  const text = `New subpoena: ${params.recipient} — compliance due ${params.complianceDeadline}

${params.summaryShort}

Read full subpoena: ${params.artifactUrl}

Unsubscribe: ${params.unsubscribeUrl}`;

  if (!resend) {
    console.info("[email] RESEND_API_KEY not set; would alert:", params.email, text);
    return { sent: false as const, logged: true as const };
  }

  await resend.emails.send({
    from,
    to: params.email,
    subject: `New subpoena: ${params.recipient}`,
    text,
  });

  return { sent: true as const };
}

export function buildConfirmUrl(token: string): string {
  return `${env.appUrl()}/api/subscribe/confirm?token=${encodeURIComponent(token)}`;
}

export function buildUnsubscribeUrl(token: string): string {
  return `${env.appUrl()}/api/subscribe/unsubscribe?token=${encodeURIComponent(token)}`;
}
