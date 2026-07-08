import { env } from "@/lib/config/env";
import { buildPixPayload } from "@/lib/pix";
import { PRE_BOOKING_FEE } from "@/lib/studio-data";

export function buildBookingPixPayload(bookingId: string) {
  return buildPixPayload({
    key: env.pixKey,
    merchantName: env.pixMerchantName,
    merchantCity: env.pixMerchantCity,
    amount: PRE_BOOKING_FEE,
    txid: bookingId,
  });
}
