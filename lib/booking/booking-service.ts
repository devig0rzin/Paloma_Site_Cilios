import { depositAmount } from "@/lib/studio-data";
import { buildBookingPixPayload } from "./booking-pix";
import { sendBookingEmail } from "./booking-email";
import { sendBookingToSchedule } from "./booking-schedule";
import { formatIntegrationError, normalizeBookingPayload, validateBooking } from "./validation";
import type { BookingPayload, BookingResult } from "./types";

export class BookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingValidationError";
  }
}

export async function createBooking(payload: Partial<BookingPayload>): Promise<BookingResult> {
  const booking = normalizeBookingPayload(payload);
  const validationError = validateBooking(booking);
  if (validationError) throw new BookingValidationError(validationError);

  const bookingId = `PALOMA${Date.now().toString().slice(-8)}`;
  const pixPayload = buildBookingPixPayload(bookingId);

  let emailSent = false;
  let scheduleSent = false;

  try {
    scheduleSent = await sendBookingToSchedule(booking, bookingId, pixPayload);
  } catch (error) {
    console.log(`Booking created, but schedule webhook failed: ${formatIntegrationError(error)}`);
  }

  try {
    emailSent = await sendBookingEmail(booking, bookingId, pixPayload);
  } catch (error) {
    console.log(`Booking saved, but email failed: ${formatIntegrationError(error)}`);
  }

  return { ok: true, bookingId, emailSent, scheduleSent, pixPayload, amount: depositAmount };
}
