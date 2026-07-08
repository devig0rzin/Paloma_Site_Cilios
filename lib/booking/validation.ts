import { bookableServices } from "@/lib/studio-data";
import type { BookingPayload } from "./types";

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function normalizeBookingPayload(payload: Partial<BookingPayload>): BookingPayload {
  return {
    bookingType: String(payload.bookingType || "").trim(),
    serviceId: String(payload.serviceId || "").trim(),
    date: String(payload.date || "").trim(),
    time: String(payload.time || "").trim(),
    name: String(payload.name || "").trim(),
    phone: String(payload.phone || "").trim(),
    email: String(payload.email || "").trim(),
    notes: String(payload.notes || "").trim(),
  };
}

export function validateBooking(booking: BookingPayload) {
  if (!bookableServices.some((service) => service.id === booking.serviceId) || !booking.date || !booking.time) {
    return "Selecao de servico, data ou horario invalida.";
  }
  if (booking.name.length < 3 || booking.phone.replace(/\D/g, "").length < 10 || !validateEmail(booking.email)) {
    return "Informe nome, telefone e e-mail validos.";
  }
  return null;
}

export function formatIntegrationError(error: unknown) {
  if (error && typeof error === "object" && "code" in error) return String(error.code);
  if (error instanceof Error) return error.message;
  return String(error);
}
