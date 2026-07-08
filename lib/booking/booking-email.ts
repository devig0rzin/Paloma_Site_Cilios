import net from "node:net";
import tls from "node:tls";
import { env } from "@/lib/config/env";
import { bookableServices, courseBookingService, formatDate } from "@/lib/studio-data";
import type { BookingPayload, EmailContent } from "./types";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const encodeHeader = (value: string) => `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;

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
        reject(new Error(`SMTP timeout after ${env.smtpTimeoutMs}ms`));
      }, env.smtpTimeoutMs);
    });
  }

  private async expect(command: string | null, okCodes: string[]) {
    if (command) this.write(command);
    const response = await this.readResponse();
    if (!okCodes.some((code) => response.startsWith(code))) throw new Error(`SMTP failed: ${response.split(/\r?\n/)[0]}`);
  }

  async connect() {
    this.socket = this.port === 465 ? tls.connect({ host: this.host, port: this.port, servername: this.host }) : net.connect(this.port, this.host);
    this.socket.setTimeout(env.smtpTimeoutMs, () => this.socket?.destroy(new Error(`SMTP connection timeout after ${env.smtpTimeoutMs}ms`)));
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

export function buildEmailContent(booking: BookingPayload, bookingId: string, pixPayload: string): EmailContent {
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
  if (!env.bookingWebhookUrl) return false;
  const content = buildEmailContent(booking, bookingId, pixPayload);
  const response = await fetch(env.bookingWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...content, booking, bookingId, pixPayload, from, to }),
  });
  if (!response.ok) throw new Error(`Webhook failed: ${response.status}`);
  return true;
}

async function sendWithResend(booking: BookingPayload, bookingId: string, pixPayload: string, from: string, to: string) {
  if (!env.resendApiKey) return false;
  const content = buildEmailContent(booking, bookingId, pixPayload);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.resendFrom || from, to, reply_to: booking.email, ...content }),
  });
  if (!response.ok) throw new Error(`Resend failed: ${response.status}`);
  return true;
}

async function sendWithSmtp(booking: BookingPayload, bookingId: string, pixPayload: string, from: string, to: string) {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPassword) return false;
  const client = new SmtpClient(env.smtpHost, env.smtpPort);
  try {
    await client.connect();
    if (env.smtpPort !== 465) await client.startTls(env.smtpHost);
    await client.login(env.smtpUser, env.smtpPassword);
    await client.send(from, to, buildMimeMessage(booking, from, to, bookingId, pixPayload));
    return true;
  } finally {
    client.close();
  }
}

export async function sendBookingEmail(booking: BookingPayload, bookingId: string, pixPayload: string) {
  const from = env.emailFrom;
  const to = env.bookingEmailTo;
  if (!to || !env.bookingEmailEnabled) return false;

  let emailSent = await sendWithWebhook(booking, bookingId, pixPayload, from, to);
  if (!emailSent) emailSent = await sendWithResend(booking, bookingId, pixPayload, from, to);
  if (!emailSent) emailSent = await sendWithSmtp(booking, bookingId, pixPayload, from, to);
  return emailSent;
}
