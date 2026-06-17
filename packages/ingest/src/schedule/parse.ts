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

const STANDARD_AGENDA_ITEMS = [
  "CALL TO ORDER",
  "ROLL CALL",
  "MEMBER INTRODUCTIONS",
  "PUBLIC COMMENT",
  "UPDATE ON COMMITTEE SUBPOENAS",
  "COMMITTEE CORRESPONDENCE",
  "SURVIVOR TESTIMONY",
  "OTHER BUSINESS",
  "ADJOURN",
];

function parseLongDate(text: string): string | null {
  const match = text.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
  if (!match) return null;

  const month = MONTH_MAP[match[1]!.toLowerCase()];
  if (!month) return null;

  const day = match[2]!.padStart(2, "0");
  return `${match[3]}-${month}-${day}`;
}

function titleCaseItem(item: string): string {
  return item
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractAgendaItems(text: string): string[] {
  const adaIndex = text.search(ADA_FOOTER_PATTERN);
  const body = (adaIndex >= 0 ? text.slice(0, adaIndex) : text).replace(/\s+/g, " ").trim();

  const teleconferenceSplit = body.split(/Via\s+Teleconference\s*/i);
  const afterHeader = teleconferenceSplit.length > 1 ? teleconferenceSplit[1]! : body;

  const timeSplit = afterHeader.match(
    /^\d{1,2}:\d{2}\s*(?:noon|am|pm)?\s*(.*)$/i,
  );
  let remaining = (timeSplit?.[1] ?? afterHeader).trim();

  if (!remaining) {
    const inlineTime = body.match(
      /\d{1,2}:\d{2}\s*(?:noon|am|pm)?\s*(.+)$/i,
    );
    remaining = inlineTime?.[1]?.trim() ?? "";
  }

  if (!remaining) return [];

  const items: string[] = [];

  while (remaining.length > 0) {
    const upperRemaining = remaining.toUpperCase();
    let matched = false;
    for (const standardItem of STANDARD_AGENDA_ITEMS) {
      if (upperRemaining.startsWith(standardItem)) {
        items.push(titleCaseItem(standardItem));
        remaining = remaining.slice(standardItem.length).trim();
        matched = true;
        break;
      }
    }

    if (matched) continue;

    const upper = remaining.toUpperCase();
    const nextStandardIndex = STANDARD_AGENDA_ITEMS.map((item) => upper.indexOf(item, 1))
      .filter((index) => index > 0)
      .sort((a, b) => a - b)[0];

    if (nextStandardIndex !== undefined) {
      const chunk = remaining.slice(0, nextStandardIndex).trim();
      if (chunk) items.push(titleCaseItem(chunk));
      remaining = remaining.slice(nextStandardIndex).trim();
      continue;
    }

    if (remaining) {
      items.push(titleCaseItem(remaining));
    }
    break;
  }

  return items.filter(Boolean);
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
  const timeMatch = fullText.match(TIME_PATTERN);

  const meetingDate =
    (headerDateMatch ? parseLongDate(headerDateMatch[0]) : null) ??
    fallbackDate ??
    "";

  if (!meetingDate) {
    throw new Error("Could not parse meeting date from agenda PDF");
  }

  const agendaItems = extractAgendaItems(fullText);

  return {
    meetingDate,
    title: `House Special Investigatory Committee — ${formatMatch ? formatMatch[1]!.toLowerCase() : "meeting"}`,
    format: formatMatch?.[1]?.toLowerCase(),
    startTime: timeMatch?.[1]?.trim(),
    revisedDate: revisedMatch?.[1],
    agendaItems,
  };
}
