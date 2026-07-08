import { NextResponse } from "next/server";
import { getAvailability, validateAvailabilityDate } from "@/lib/calendar/availability-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = String(searchParams.get("date") || "").trim();
  const serviceId = String(searchParams.get("serviceId") || "").trim();

  if (!validateAvailabilityDate(date)) {
    return NextResponse.json({ error: "Data invalida." }, { status: 400 });
  }

  return NextResponse.json(await getAvailability(date, serviceId));
}
