export const env = {
  pixKey: process.env.PIX_KEY || "INSERIR-CHAVE-PIX",
  pixMerchantName: process.env.PIX_MERCHANT_NAME || "PALOMA LASH",
  pixMerchantCity: process.env.PIX_MERCHANT_CITY || "SAO PAULO",

  bookingEmailTo: process.env.BOOKING_EMAIL_TO || "",
  bookingEmailEnabled: process.env.BOOKING_EMAIL_ENABLED !== "false",
  emailFrom: process.env.EMAIL_FROM || "site@palomalash.com",
  bookingWebhookUrl: process.env.BOOKING_WEBHOOK_URL || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  resendFrom: process.env.RESEND_FROM || "",

  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPassword: process.env.SMTP_PASSWORD || "",
  smtpTimeoutMs: Number(process.env.SMTP_TIMEOUT_MS || 8000),

  scheduleWebhookUrl: process.env.SCHEDULE_WEBHOOK_URL || process.env.BOOKING_SHEETS_WEBHOOK_URL || "",
  scheduleWebhookToken: process.env.SCHEDULE_WEBHOOK_TOKEN || "",
  googleCalendarIcsUrl: process.env.GOOGLE_CALENDAR_ICS_URL || "",
};
