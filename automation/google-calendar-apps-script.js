const CALENDAR_ID = "igor.alves.mba@gmail.com";
const PALOMA_EMAIL = "igor.ameidaalves7@gmail.com";
const WEBHOOK_TOKEN = "";
const DEFAULT_DURATION_MINUTES = 120;
const TIMEZONE = Session.getScriptTimeZone() || "America/Sao_Paulo";

function doPost(e) {
  var eventCreated = false;
  var eventId = "";

  try {
    const payload = parsePostPayload(e);
    validateToken(payload.token);

    console.log("Booking received: " + safeValue(payload.bookingId));
    const calendar = getCalendar();
    const start = parseLocalDateTime(payload.date, payload.time);
    const durationMinutes = Number(payload.durationMinutes || DEFAULT_DURATION_MINUTES);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const event = calendar.createEvent(buildEventTitle(payload), start, end, {
      description: buildEventDescription(payload),
    });
    eventCreated = true;
    eventId = event.getId();
    console.log("Calendar event created: " + eventId);

    const emailResult = sendBookingEmail(payload);

    return jsonResponse({
      ok: true,
      eventCreated: eventCreated,
      eventId: eventId,
      emailSent: emailResult.sent,
      emailError: emailResult.error,
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error("Booking automation failed: " + errorMessage);
    return jsonResponse({
      ok: eventCreated,
      eventCreated: eventCreated,
      eventId: eventId,
      emailSent: false,
      emailError: eventCreated ? errorMessage : "",
      error: eventCreated ? "" : errorMessage,
    });
  }
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    validateToken(params.token);

    if (params.action !== "getOccupiedTimes") {
      throw new Error("Acao invalida.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(params.date || ""))) {
      throw new Error("Data invalida.");
    }

    const calendar = getCalendar();
    const start = parseLocalDateTime(params.date, "00:00");
    const end = new Date(start.getTime());
    end.setDate(end.getDate() + 1);

    const occupiedTimes = calendar
      .getEvents(start, end)
      .filter(function (event) {
        return !event.isAllDayEvent();
      })
      .map(function (event) {
        return Utilities.formatDate(event.getStartTime(), TIMEZONE, "HH:mm");
      });

    return jsonResponse({
      ok: true,
      occupiedTimes: uniqueValues(occupiedTimes),
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      occupiedTimes: [],
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function parsePostPayload(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Payload ausente.");
  }
  return JSON.parse(e.postData.contents);
}

function validateToken(token) {
  if (!WEBHOOK_TOKEN) return;
  if (String(token || "") !== WEBHOOK_TOKEN) {
    throw new Error("Token invalido.");
  }
}

function validateEmailConfig() {
  const email = safeValue(PALOMA_EMAIL);
  if (!email || email === "COLE_AQUI_O_EMAIL_DA_PALOMA") {
    throw new Error("PALOMA_EMAIL nao configurado.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("PALOMA_EMAIL invalido: " + email);
  }
}

function getCalendar() {
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) {
    throw new Error("Agenda nao encontrada. Confira CALENDAR_ID.");
  }
  return calendar;
}

function parseLocalDateTime(date, time) {
  const dateParts = String(date || "").split("-").map(Number);
  const timeParts = String(time || "").split(":").map(Number);
  if (dateParts.length !== 3 || timeParts.length < 2) {
    throw new Error("Data ou horario invalido.");
  }
  return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1], 0);
}

function buildEventTitle(payload) {
  return "Reserva site - " + safeValue(payload.clientName) + " - " + safeValue(payload.serviceName || payload.service);
}

function buildEventDescription(payload) {
  return [
    "Nova reserva pelo site Paloma Correa Beauty & Academy",
    "",
    "Booking ID: " + safeValue(payload.bookingId),
    "Cliente: " + safeValue(payload.clientName),
    "Telefone: " + safeValue(payload.clientPhone),
    "E-mail: " + safeValue(payload.clientEmail),
    "Servico/procedimento: " + safeValue(payload.serviceName || payload.service || payload.serviceId),
    "Tipo: " + safeValue(payload.bookingType),
    "Data: " + safeValue(payload.date),
    "Horario: " + safeValue(payload.time),
    "Observacoes: " + safeValue(payload.notes || "-"),
    "Sinal Pix: R$ " + formatMoney(payload.depositAmount),
    "",
    "Pix copia e cola:",
    safeValue(payload.pixPayload),
  ].join("\n");
}

function sendBookingEmail(payload) {
  try {
    validateEmailConfig();
    console.log("Sending booking email to: " + safeValue(PALOMA_EMAIL));
    MailApp.sendEmail({
      to: safeValue(PALOMA_EMAIL),
      subject: "Nova reserva pelo site - " + safeValue(payload.clientName),
      body: buildEventDescription(payload),
      name: "Paloma Correa Beauty & Academy",
      replyTo: safeValue(payload.clientEmail),
    });
    console.log("Booking email sent to: " + safeValue(PALOMA_EMAIL));
    return {
      sent: true,
      error: "",
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error("Booking email failed: " + errorMessage);
    return {
      sent: false,
      error: errorMessage,
    };
  }
}

function safeValue(value) {
  return String(value || "").trim();
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

function uniqueValues(values) {
  return values.filter(function (value, index) {
    return values.indexOf(value) === index;
  });
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
