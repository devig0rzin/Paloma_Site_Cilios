import { createCalendarBooking } from "@/lib/calendar/apps-script-client";
import type { BookingPayload } from "./types";

export async function sendBookingToSchedule(booking: BookingPayload, bookingId: string, pixPayload: string) {
  return createCalendarBooking(booking, bookingId, pixPayload);
}
