import net from "node:net";
import tls from "node:tls";
import { NextResponse } from "next/server";
import { buildPixPayload } from "@/lib/pix";
import { bookableServices, courseBookingService, depositAmount, formatDate } from "@/lib/studio-data";

export const runtime = "nodejs";

type BookingPayload = {
  bookingType?: string;
  serviceId: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  notes?: string;
};

const smtpTimeoutMs = Number(process.env.SMTP_TIMEOUT_MS || 8000);

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const encodeHeader = (value: string) => `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const formatSmtpError = (error: unknown) => {
  if (error && typeof error === "object" && "code" in error) return String(error.code);
  if (error instanceof Error) return error.message;
  return String(error);
};

class SmtpClient {
  private socket?: net.Socket | tls.TLSSocket;
  private buffer = "";

  constructor(
    private readonly host: string,
    private readonly port: number,
  ) {}

  private write(command: string) {
    this.socket?.write(`${command}\r\n`);
  }

  private readResponse() {
    return new Promise<string>((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout>;
      const cleanup = () => {
        clearTimeout(timeout);
        this.socket?.off("data", onData);
        this.socket?.off("error", onError);
      };
      const onData = (chunk: Buffer) => {
        this.buffer += chunk.toString("utf8");
        const lines = this.buffer.split(/\r?\n/).filter(Boolean);
        const last = lines.at(-1);
        if (last && /^\d{3}\s/.test(last)) {
          cleanup();
          const response = this.buffer;
          this.buffer = "";
          resolve(response);
        }
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      this.socket?.on("data", onData);
      this.socket?.once("error", onError);
      timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`SMTP timeout after ${smtpTimeoutMs}ms`));
      }, smtpTimeoutMs);
    });
  }

  private async expect(command: string | null, okCodes: string[]) {
    if (command) this.write(command);
    const response = await this.readResponse();
    if (!okCodes.some((code) => response.startsWith(code))) throw new Error(`SMTP failed: ${response.split(/\r?\n/)[0]}`);
  }

  async connect() {
    this.socket = this.port === 465 ? tls.connect({ host: this.host, port: this.port, servername: this.host }) : net.connect(this.port, this.host);
    this.socket.setTimeout(smtpTimeoutMs, () => this.socket?.destroy(new Error(`SMTP connection timeout after ${smtpTimeoutMs}ms`)));
    await this.expect(null, ["220"]);
  }

  async startTls(servername: string) {
    await this.expect(`EHLO ${servername}`, ["250"]);
    await this.expect("STARTTLS", ["220"]);
    this.socket = tls.connect({ socket: this.socket, servername });
    this.buffer = "";
    await new Promise<void>((resolve, reject) => {
      const secureSocket = this.socket as tls.TLSSocket;
      secureSocket.once("secureConnect", resolve);
      secureSocket.once("error", reject);
    });
    await this.expect(`EHLO ${servername}`, ["250"]);
  }

  async login(user: string, password: string) {
    await this.expect("AUTH LOGIN", ["334"]);
    await this.expect(Buffer.from(user, "utf8").toString("base64"), ["334"]);
    await this.expect(Buffer.from(password.replace(/\s/g, ""), "utf8").toString("base64"), ["235"]);
  }

  async send(from: string, to: string, message: string) {
    await this.expect(`MAIL FROM:<${from}>`, ["250"]);
    await this.expect(`RCPT TO:<${to}>`, ["250", "251"]);
    await this.expect("DATA", ["354"]);
    this.write(`${message.replace(/\r?\n\./g, "\r\n..")}\r\n.`);
    await this.expect(null, ["250"]);
    await this.expect("QUIT", ["221"]);
  }

  close() {
    this.socket?.end();
  }
}

function buildEmailContent(booking: BookingPayload, bookingId: string, pixPayload: string) {
  const service = bookableServices.find((item) => item.id === booking.serviceId);
  const bookingType = booking.serviceId === courseBookingService.id ? "Curso" : "Cilios";
  const subject = `Nova reserva de ${bookingType.toLowerCase()} - ${booking.name}`;
  const text = [
    "Nova reserva pelo site Paloma Lash Studio",
    "",
    `Reserva: ${bookingId}`,
    `Tipo: ${bookingType}`,
    `Cliente: ${booking.name}`,
    `Telefone: ${booking.phone}`,
    `E-mail: ${booking.email}`,
    `Servico/curso: ${service?.name || booking.serviceId}`,
    `Data: ${formatDate(booking.date)}`,
    `Horario: ${booking.time}`,
    `Sinal Pix: R$ 1,00`,
    `Observacoes: ${booking.notes || "-"}`,
    "",
    "Pix copia e cola:",
    pixPayload,
  ].join("\n");
  const html = `
    <h2>Nova reserva pelo site</h2>
    <p><strong>Reserva:</strong> ${escapeHtml(bookingId)}</p>
    <p><strong>Tipo:</strong> ${escapeHtml(bookingType)}</p>
    <p><strong>Cliente:</strong> ${escapeHtml(booking.name)}</p>
    <p><strong>Telefone:</strong> ${escapeHtml(booking.phone)}</p>
    <p><strong>E-mail:</strong> ${escapeHtml(booking.email)}</p>
    <p><strong>Servico/curso:</strong> ${escapeHtml(service?.name || booking.serviceId)}</p>
    <p><strong>Data:</strong> ${escapeHtml(formatDate(booking.date))}</p>
    <p><strong>Horario:</strong> ${escapeHtml(booking.time)}</p>
    <p><strong>Sinal Pix:</strong> R$ 1,00</p>
    <p><strong>Observacoes:</strong> ${escapeHtml(booking.notes || "-")}</p>
    <p><strong>Pix copia e cola:</strong><br>${escapeHtml(pixPayload)}</p>
  `.trim();
  return { subject, text, html };
}

function buildMimeMessage(booking: BookingPayload, from: string, to: string, bookingId: string, pixPayload: string) {
  const { subject, text, html } = buildEmailContent(booking, bookingId, pixPayload);
  const boundary = `paloma-${crypto.randomUUID()}`;
  return [
    `From: ${encodeHeader("Paloma Lash Studio")} <${from}>`,
    `To: ${to}`,
    `Reply-To: ${booking.email}`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");
}

async function sendWithWebhook(booking: BookingPayload, bookingId: string, pixPayload: string, from: string, to: string) {
  if (!process.env.BOOKING_WEBHOOK_URL) return false;
  const content = buildEmailContent(booking, bookingId, pixPayload);
  const response = await fetch(process.env.BOOKING_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...content, booking, bookingId, pixPayload, from, to }),
  });
  if (!response.ok) throw new Error(`Webhook failed: ${response.status}`);
  return true;
}

async function sendToScheduleWebhook(booking: BookingPayload, bookingId: string, pixPayload: string) {
  const webhookUrl = process.env.SCHEDULE_WEBHOOK_URL || process.env.BOOKING_SHEETS_WEBHOOK_URL || "";
  if (!webhookUrl) return false;

  const service = bookableServices.find((item) => item.id === booking.serviceId);
  const bookingType = booking.serviceId === courseBookingService.id ? "curso" : "cilios";
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
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
  return true;
}

async function sendWithResend(booking: BookingPayload, bookingId: string, pixPayload: string, from: string, to: string) {
  if (!process.env.RESEND_API_KEY) return false;
  const content = buildEmailContent(booking, bookingId, pixPayload);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.RESEND_FROM || from, to, reply_to: booking.email, ...content }),
  });
  if (!response.ok) throw new Error(`Resend failed: ${response.status}`);
  return true;
}

export async function POST(request: Request) {
  const payload = (await request.json()) as BookingPayload;
  const booking = {
    bookingType: String(payload.bookingType || "").trim(),
    serviceId: String(payload.serviceId || "").trim(),
    date: String(payload.date || "").trim(),
    time: String(payload.time || "").trim(),
    name: String(payload.name || "").trim(),
    phone: String(payload.phone || "").trim(),
    email: String(payload.email || "").trim(),
    notes: String(payload.notes || "").trim(),
  };

  if (!bookableServices.some((service) => service.id === booking.serviceId) || !booking.date || !booking.time) {
    return NextResponse.json({ error: "Selecao de servico, data ou horario invalida." }, { status: 400 });
  }
  if (booking.name.length < 3 || booking.phone.replace(/\D/g, "").length < 10 || !validateEmail(booking.email)) {
    return NextResponse.json({ error: "Informe nome, telefone e e-mail validos." }, { status: 400 });
  }

  const bookingId = `PALOMA${Date.now().toString().slice(-8)}`;
  const pixKey = process.env.PIX_KEY || "INSERIR-CHAVE-PIX";
  const pixPayload = buildPixPayload({
    key: pixKey,
    merchantName: process.env.PIX_MERCHANT_NAME || "PALOMA LASH",
    merchantCity: process.env.PIX_MERCHANT_CITY || "SAO PAULO",
    amount: depositAmount,
    txid: bookingId,
  });

  let emailSent = false;
  let scheduleSent = false;
  const from = process.env.EMAIL_FROM || "site@palomalash.com";
  const to = process.env.BOOKING_EMAIL_TO || process.env.NEXT_PUBLIC_BOOKING_EMAIL || "";

  try {
    scheduleSent = await sendToScheduleWebhook(booking, bookingId, pixPayload);
  } catch (error) {
    console.log(`Booking created, but schedule webhook failed: ${formatSmtpError(error)}`);
  }

  if (to && process.env.BOOKING_EMAIL_ENABLED !== "false") {
    try {
      emailSent = await sendWithWebhook(booking, bookingId, pixPayload, from, to);
      if (!emailSent) emailSent = await sendWithResend(booking, bookingId, pixPayload, from, to);
      if (!emailSent && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
        const client = new SmtpClient(process.env.SMTP_HOST, Number(process.env.SMTP_PORT || 587));
        try {
          await client.connect();
          if (Number(process.env.SMTP_PORT || 587) !== 465) await client.startTls(process.env.SMTP_HOST);
          await client.login(process.env.SMTP_USER, process.env.SMTP_PASSWORD);
          await client.send(from, to, buildMimeMessage(booking, from, to, bookingId, pixPayload));
          emailSent = true;
        } finally {
          client.close();
        }
      }
    } catch (error) {
      console.log(`Booking saved, but email failed: ${formatSmtpError(error)}`);
    }
  }

  return NextResponse.json({ ok: true, bookingId, emailSent, scheduleSent, pixPayload, amount: depositAmount });
}
