import { loadSources } from "../sources";

export type SubpoenaManifestItem = ReturnType<
  typeof loadSources
>["subpoenas"]["items"][number];

export type ParsedSubpoena = {
  recipient: string;
  issuedDate: string;
  complianceDeadline: string;
  requestedRecordTypes: string[];
  aliases: string[];
};

const RECORD_TYPE_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "Communications", pattern: /\bcommunications?\b/i },
  { label: "Emails", pattern: /\be-?mails?\b/i },
  { label: "Documents", pattern: /\bdocuments?\b/i },
  { label: "Records", pattern: /\brecords?\b/i },
  { label: "Correspondence", pattern: /\bcorrespondence\b/i },
  { label: "Policies", pattern: /\bpolic(y|ies)\b/i },
  { label: "Personnel files", pattern: /\bpersonnel\b/i },
  { label: "Financial records", pattern: /\bfinancial\b/i },
];

export function slugFromSubpoenaId(id: string): string {
  return `${id.replace(/_/g, "-")}-june-2026`;
}

export function titleFromRecipient(recipient: string): string {
  return `Subpoena — ${recipient}`;
}

export function parseSubpoenaFields(
  item: SubpoenaManifestItem,
  fullText: string,
): ParsedSubpoena {
  const sources = loadSources();
  const requestedRecordTypes = RECORD_TYPE_PATTERNS.filter(({ pattern }) =>
    pattern.test(fullText),
  ).map(({ label }) => label);

  return {
    recipient: item.recipient,
    issuedDate: sources.subpoenas.issuedDate,
    complianceDeadline: sources.subpoenas.complianceDeadline,
    requestedRecordTypes:
      requestedRecordTypes.length > 0
        ? requestedRecordTypes
        : ["Records (see full text)"],
    aliases: item.aliases ?? [],
  };
}
