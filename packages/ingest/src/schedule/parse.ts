export type ParsedAgenda = {
  meetingDate: string;
  title: string;
  format?: string;
  startTime?: string;
  revisedDate?: string;
  agendaItems: string[];
};

const ADA_FOOTER_PATTERN = /if you have a disability/i;
const REVISED_PATTERN = /Revised:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i;
const HEADER_DATE_PATTERN =
  /(?:HOUSE SPECIAL INVESTIGATORY COMMITTEE|HISC)\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i;
const FORMAT_PATTERN = /Via\s+([A-Za-z]+)/i;
const TIME_PATTERN = /(\d{1,2}:\d{2}\s*(?:noon|am|pm)?)/i;

const MONTH_MAP: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

function parseLongDate(text: string): string | null {
  const match = text.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
  if (!match) return null;

  const month = MONTH_MAP[match[1]!.toLowerCase()];
  if (!month) return null;

  const day = match[2]!.padStart(2, "0");
  return `${match[3]}-${month}-${day}`;
}

function normalizeAgendaItem(line: string): string {
  return line
    .replace(/^\d+[\.\)]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugFromAgendaDate(date: string): string {
  return `hisc-agenda-${date}`;
}

export function titleFromAgendaDate(date: string): string {
  return `HISC Agenda — ${date}`;
}

export function parseAgendaText(fullText: string, fallbackDate?: string): ParsedAgenda {
  const revisedMatch = fullText.match(REVISED_PATTERN);
  const headerDateMatch = fullText.match(HEADER_DATE_PATTERN);
  const formatMatch = fullText.match(FORMAT_PATTERN);

  const meetingDate =
    (headerDateMatch ? parseLongDate(headerDateMatch[0]) : null) ??
    fallbackDate ??
    "";

  if (!meetingDate) {
    throw new Error("Could not parse meeting date from agenda PDF");
  }

  const adaIndex = fullText.search(ADA_FOOTER_PATTERN);
  const body = adaIndex >= 0 ? fullText.slice(0, adaIndex) : fullText;

  const lines = body
    .split(/\s{2,}|\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const agendaItems: string[] = [];
  let foundTime = false;

  for (const line of lines) {
    if (/^TENTATIVE AGENDA/i.test(line)) continue;
    if (/^Revised:/i.test(line)) continue;
    if (/HOUSE SPECIAL INVESTIGATORY COMMITTEE/i.test(line)) continue;
    if (/Via\s+[A-Za-z]+/i.test(line) && line.length < 40) continue;
    if (/^\d{1,2}:\d{2}/.test(line)) {
      foundTime = true;
      const itemPart = line.replace(TIME_PATTERN, "").trim();
      if (itemPart) agendaItems.push(normalizeAgendaItem(itemPart));
      continue;
    }
    if (!foundTime && /^\d{1,2}:\d{2}/.test(line)) continue;

    const normalized = normalizeAgendaItem(line);
    if (
      normalized.length > 2 &&
      !/^[A-Za-z]+\s+\d{1,2},\s+\d{4}$/.test(normalized) &&
      !/^TENTATIVE/i.test(normalized)
    ) {
      agendaItems.push(normalized);
    }
  }

  const uniqueItems = [...new Set(agendaItems)].filter(
    (item) => !/^\d{1,2}:\d{2}/.test(item),
  );

  const timeMatch = fullText.match(TIME_PATTERN);

  return {
    meetingDate,
    title: `House Special Investigatory Committee — ${formatMatch ? formatMatch[1]!.toLowerCase() : "meeting"}`,
    format: formatMatch?.[1]?.toLowerCase(),
    startTime: timeMatch?.[1]?.trim(),
    revisedDate: revisedMatch?.[1],
    agendaItems: uniqueItems,
  };
}
