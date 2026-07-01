import { NextResponse } from "next/server";
import { bookableServices, canFitServiceAtTime, getAvailableTimesForDate, isClosedDay } from "@/lib/studio-data";

export const runtime = "nodejs";

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

async function getOccupiedTimesFromCalendar(date: string) {
  const calendarUrl = process.env.GOOGLE_CALENDAR_ICS_URL || "";
  if (!calendarUrl) return [];

  const response = await fetch(calendarUrl, { method: "GET", next: { revalidate: 0 } });
  if (!response.ok) throw new Error(`Google Calendar ICS failed: ${response.status}`);

  const ics = unfoldIcs(await response.text());
  const events = ics.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  return events
    .map((event) => getIcsField(event, "DTSTART"))
    .filter((start) => sameDateFromIcs(start, date))
    .map(formatTimeFromIcs)
    .filter(Boolean);
}

async function getOccupiedTimes(date: string) {
  const webhookUrl = process.env.SCHEDULE_WEBHOOK_URL || process.env.BOOKING_SHEETS_WEBHOOK_URL || "";
  if (webhookUrl) {
    try {
      const url = new URL(webhookUrl);
      url.searchParams.set("action", "getOccupiedTimes");
      url.searchParams.set("date", date);
      url.searchParams.set("professionalId", "paloma");
      url.searchParams.set("barberId", "paloma");

      const response = await fetch(url.toString(), { method: "GET", next: { revalidate: 0 } });
      if (!response.ok) throw new Error(`Availability webhook failed: ${response.status}`);

      const data = await response.json().catch(() => ({}));
      if (Array.isArray(data.occupiedTimes)) return data.occupiedTimes.map(String);
      if (Array.isArray(data.bookedTimes)) return data.bookedTimes.map(String);
      if (Array.isArray(data.times)) return data.times.map(String);
    } catch (error) {
      console.log(error instanceof Error ? error.message : String(error));
    }
  }

  return getOccupiedTimesFromCalendar(date);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = String(searchParams.get("date") || "").trim();
  const serviceId = String(searchParams.get("serviceId") || "").trim();
  const service = bookableServices.find((item) => item.id === serviceId) || bookableServices[0];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Data invalida." }, { status: 400 });
  }

  if (isClosedDay(date)) {
    return NextResponse.json({ date, occupiedTimes: [], slots: [], closed: true });
  }

  try {
    const occupiedTimes = await getOccupiedTimes(date);
    const slots = getAvailableTimesForDate(date).map((time) => {
      const occupied = occupiedTimes.includes(time);
      const fits = canFitServiceAtTime(time, date, service.duration);
      return { time, available: !occupied && fits, status: occupied ? "ocupado" : fits ? "livre" : "sem tempo" };
    });

    return NextResponse.json({ date, occupiedTimes, slots, closed: false });
  } catch (error) {
    console.log(error instanceof Error ? error.message : String(error));
    const slots = getAvailableTimesForDate(date).map((time) => ({
      time,
      available: canFitServiceAtTime(time, date, service.duration),
      status: canFitServiceAtTime(time, date, service.duration) ? "livre" : "sem tempo",
    }));
    return NextResponse.json({ date, occupiedTimes: [], slots, closed: false, fallback: true });
  }
}
