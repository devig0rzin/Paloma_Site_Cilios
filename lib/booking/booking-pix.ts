import { env } from "@/lib/config/env";
import { buildPixPayload } from "@/lib/pix";
import { depositAmount } from "@/lib/studio-data";

export function buildBookingPixPayload(bookingId: string) {
  return buildPixPayload({
    key: env.pixKey,
    merchantName: env.pixMerchantName,
    merchantCity: env.pixMerchantCity,
    amount: depositAmount,
    txid: bookingId,
  });
}
