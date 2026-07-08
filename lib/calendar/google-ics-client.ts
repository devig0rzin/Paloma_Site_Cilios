import { env } from "@/lib/config/env";

function unfoldIcs(value: string) {
  return value.replace(/\r?\n[ \t]/g, "");
}

function getIcsField(event: string, field: string) {
  const line = event.split(/\r?\n/).find((item) => item.startsWith(`${field}`));
  return line?.split(":").slice(1).join(":").trim() || "";
}

function formatTimeFromIcs(value: string) {
  const match = value.match(/T(\d{2})(\d{2})/);
  if (!match) return "";
  return `${match[1]}:${match[2]}`;
}

function sameDateFromIcs(value: string, date: string) {
  const compactDate = date.replace(/-/g, "");
  return value.startsWith(compactDate) || value.includes(`${compactDate}T`);
}

export async function getOccupiedTimesFromIcs(date: string) {
  if (!env.googleCalendarIcsUrl) return [];

  const response = await fetch(env.googleCalendarIcsUrl, { method: "GET", next: { revalidate: 0 } });
  if (!response.ok) throw new Error(`Google Calendar ICS failed: ${response.status}`);

  const ics = unfoldIcs(await response.text());
  const events = ics.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  return events
    .map((event) => getIcsField(event, "DTSTART"))
    .filter((start) => sameDateFromIcs(start, date))
    .map(formatTimeFromIcs)
    .filter(Boolean);
}
