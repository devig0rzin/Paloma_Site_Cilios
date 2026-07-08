export type BookingPayload = {
  bookingType?: string;
  serviceId: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  notes?: string;
};

export type BookingResult = {
  ok: true;
  bookingId: string;
  emailSent: boolean;
  scheduleSent: boolean;
  pixPayload: string;
  amount: number;
};

export type EmailContent = {
  subject: string;
  text: string;
  html: string;
};
