import { env } from "@/lib/config/env";
import { bookableServices, courseBookingService, depositAmount } from "@/lib/studio-data";
import type { BookingPayload } from "@/lib/booking/types";

function readStringArray(data: unknown, key: string) {
  if (!data || typeof data !== "object" || !(key in data)) return null;
  const value = (data as Record<string, unknown>)[key];
  return Array.isArray(value) ? value.map(String) : null;
}

export async function getOccupiedTimesFromAppsScript(date: string) {
  if (!env.scheduleWebhookUrl) return null;

  const url = new URL(env.scheduleWebhookUrl);
  url.searchParams.set("action", "getOccupiedTimes");
  url.searchParams.set("date", date);
  url.searchParams.set("professionalId", "paloma");
  url.searchParams.set("barberId", "paloma");
  if (env.scheduleWebhookToken) url.searchParams.set("token", env.scheduleWebhookToken);

  const response = await fetch(url.toString(), { method: "GET", next: { revalidate: 0 } });
  if (!response.ok) throw new Error(`Availability webhook failed: ${response.status}`);

  const data: unknown = await response.json().catch(() => ({}));
  return readStringArray(data, "occupiedTimes") || readStringArray(data, "bookedTimes") || readStringArray(data, "times") || [];
}

export async function createCalendarBooking(booking: BookingPayload, bookingId: string, pixPayload: string) {
  if (!env.scheduleWebhookUrl) return false;

  const service = bookableServices.find((item) => item.id === booking.serviceId);
  const bookingType = booking.serviceId === courseBookingService.id ? "curso" : "cilios";
  const response = await fetch(env.scheduleWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "createBooking",
      token: env.scheduleWebhookToken || undefined,
      bookingId,
      professionalId: "paloma",
      professional: "Paloma Correa",
      barberId: "paloma",
      barberName: "Paloma Correa",
      barber: "Paloma Correa",
      clientName: booking.name,
      clientPhone: booking.phone,
      clientEmail: booking.email,
      bookingType,
      serviceId: booking.serviceId,
      service: service?.name || booking.serviceId,
      serviceName: service?.name || booking.serviceId,
      durationMinutes: service?.duration || 0,
      date: booking.date,
      time: booking.time,
      price: service?.price || 0,
      depositAmount,
      pixPayload,
      notes: booking.notes || "",
      createdAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) throw new Error(`Schedule webhook failed: ${response.status}`);

  const data: unknown = await response.json().catch(() => null);
  if (data && typeof data === "object" && "ok" in data && data.ok !== true) {
    throw new Error("Schedule webhook returned ok=false");
  }
  if (data && typeof data === "object" && "emailSent" in data && data.emailSent !== true) {
    const emailError = "emailError" in data ? String(data.emailError || "") : "";
    console.log(`Schedule webhook created event, but email was not sent${emailError ? `: ${emailError}` : "."}`);
  }

  return true;
}
