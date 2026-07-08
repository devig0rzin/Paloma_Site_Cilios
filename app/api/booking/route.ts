import { NextResponse } from "next/server";
import { BookingValidationError, createBooking } from "@/lib/booking/booking-service";
import type { BookingPayload } from "@/lib/booking/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<BookingPayload>;
    const result = await createBooking(payload);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BookingValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.log(error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Nao foi possivel criar a reserva." }, { status: 500 });
  }
}
