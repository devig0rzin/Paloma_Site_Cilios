"use client";

import Image from "next/image";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useMemo, useRef, useState } from "react";
import { bookableServices, contact, course, courseBookingService, PALOMA_WORKING_DAYS, PRE_BOOKING_FEE, formatDate as formatStudioDate, isClosedDay, services } from "@/lib/studio-data";
import { formatCurrency } from "@/lib/pix";

type Step = 1 | 2 | 3 | 4 | 5;
type BookingType = "cilios" | "curso";

type BookingResult = {
  bookingId: string;
  pixPayload: string;
  emailSent: boolean;
  scheduleSent: boolean;
};

type AvailabilitySlot = {
  time: string;
  available: boolean;
  status: string;
};

const storageKey = "palomaLashBookings";
const whatsappHref = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(contact.whatsappMessage)}`;

const proofNotes = [
  { value: "mapa", label: "mapeamento definido pelo formato dos olhos, nao por moda pronta" },
  { value: "fio", label: "curvatura, espessura e peso escolhidos para preservar conforto" },
  { value: "rotina", label: "orientacao de manutencao para o resultado continuar bonito" },
];

const methodSteps = [
  { title: "Leitura do olhar", text: "Paloma observa formato, inclinacao, espaco da palpebra e expectativa da cliente antes de sugerir o efeito." },
  { title: "Escolha tecnica", text: "O procedimento e ajustado por curvatura, espessura, volume e mapeamento para nao pesar nem deformar o olhar." },
  { title: "Finalizacao limpa", text: "Aplicacao organizada, fios alinhados e explicacao de cuidados para a manutencao render melhor." },
];

const serviceGroups = [
  { title: "Natural", text: "Fio a fio e lash lifting para quem quer acordar pronta sem parecer exagerado.", ids: ["fio-a-fio", "lash-lifting"] },
  { title: "Marcante", text: "Volumes com presenca para fotos, eventos e rotina de beleza mais expressiva.", ids: ["volume-brasileiro", "volume-russo"] },
  { title: "Cuidado", text: "Manutencao e remocao segura para preservar o acabamento e os fios naturais.", ids: ["manutencao", "remocao"] },
];

const testimonials = [
  { label: "Volume natural", quote: "Meu olhar ficou leve e elegante. A Paloma entendeu exatamente o efeito que eu queria." },
  { label: "Primeira aplicacao", quote: "Atendimento cuidadoso, explicacao clara e resultado muito caprichado." },
  { label: "Manutencao", quote: "A manutencao ficou impecavel, sem ardencia e com acabamento natural." },
];

const gallery = [
  { kind: "image", src: "/Imagens/resultado-volume-curvatura.jpg", title: "Volume com curvatura marcada", wide: true },
  {
    kind: "video",
    src: "/Video/fio_a_fio.mp4",
    poster: "/Imagens/resultado-fio-a-fio-detalhe.jpg",
    title: "Fio a fio delicado",
  },
  { kind: "image", src: "/Imagens/resultado-volume-brasileiro.jpg", title: "Volume marcante", className: "focus-lashes" },
  {
    kind: "video",
    src: "/Video/volume_brasileiro.mp4",
    poster: "/Imagens/resultado-volume-brasileiro.jpg",
    title: "Volume brasileiro",
  },
  { kind: "image", src: "/Imagens/resultado-efeito-fox.jpg", title: "Efeito Fox" },
  {
    kind: "video",
    src: "/Video/Model_with_eyelash_extensions_202607012326.mp4",
    poster: "/Imagens/resultado-cliente-real.jpg",
    title: "Resultado real em video",
  },
] as const;

const getGalleryFigureClassName = (item: (typeof gallery)[number]) =>
  `${"wide" in item && item.wide ? "wide" : ""} ${"className" in item ? item.className : ""}`.trim();

const AGENDA_TIMEZONE = "America/Sao_Paulo";

// Data/hora atuais no fuso de Brasilia, independente do fuso do servidor/navegador.
function getSaoPauloDateParts(reference = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: AGENDA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getAgendaStats() {
  const { year, month, day } = getSaoPauloDateParts();
  const totalDaysInMonth = getDaysInMonth(year, month);
  const daysUntilMonthEnd = totalDaysInMonth - day + 1;
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );

  let agendaDays = 0;
  for (let currentDay = day; currentDay <= totalDaysInMonth; currentDay += 1) {
    const dayOfWeek = new Date(Date.UTC(year, month - 1, currentDay)).getUTCDay();
    if (PALOMA_WORKING_DAYS.includes(dayOfWeek)) agendaDays += 1;
  }

  return {
    monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
    daysUntilMonthEnd,
    agendaDays,
  };
}

const getStoredBookings = () => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "[]") as { date: string; time: string }[];
  } catch {
    return [];
  }
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 448 512">
      <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
    </svg>
  );
}

export default function Home() {
  const [step, setStep] = useState<Step>(1);
  const [bookingType, setBookingType] = useState<BookingType>("cilios");
  const [serviceId, setServiceId] = useState<string>(services[1].id);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [notice, setNotice] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [copied, setCopied] = useState(false);
  const bookingPanelRef = useRef<HTMLDivElement>(null);

  const selectedService = bookableServices.find((service) => service.id === serviceId) || services[0];
  const isCourseBooking = bookingType === "curso";
  const agendaStats = useMemo(() => getAgendaStats(), []);
  const minDate = new Date().toISOString().split("T")[0];
  const maxDate = useMemo(() => {
    const day = new Date();
    day.setDate(day.getDate() + 30);
    return day.toISOString().split("T")[0];
  }, []);

  useEffect(() => {
    if (!date || isClosedDay(date)) {
      setSlots([]);
      setAvailabilityNote(date ? "Atendimento fechado nesse dia. Escolha terca a sabado." : "");
      return;
    }

    let isActive = true;
    setIsLoadingSlots(true);
    setAvailabilityNote("Consultando agenda da Paloma...");

    fetch(`/api/availability?date=${date}&serviceId=${serviceId}`)
      .then((response) => response.json())
      .then((data) => {
        if (!isActive) return;
        const localOccupied = getStoredBookings().filter((booking) => booking.date === date).map((booking) => booking.time);
        const mergedSlots = (data.slots || []).map((slot: AvailabilitySlot) => ({
          ...slot,
          available: slot.available && !localOccupied.includes(slot.time),
          status: localOccupied.includes(slot.time) ? "ocupado" : slot.status,
        }));

        setSlots(mergedSlots);
        setAvailabilityNote(data.fallback ? "Agenda externa indisponivel. Mostrando horarios base do studio." : "Agenda consultada. Escolha um horario livre.");
        if (time && !mergedSlots.some((slot: AvailabilitySlot) => slot.time === time && slot.available)) setTime("");
      })
      .catch(() => {
        if (!isActive) return;
        setSlots([]);
        setTime("");
        setAvailabilityNote("Nao foi possivel consultar a agenda agora. Tente novamente em instantes.");
      })
      .finally(() => {
        if (isActive) setIsLoadingSlots(false);
      });

    return () => {
      isActive = false;
    };
  }, [date, serviceId, time]);

  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    bookingPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [step, result]);

  function validateCurrentStep() {
    setNotice("");
    if (step === 1 && !serviceId) return "Escolha cilios ou curso para continuar.";
    if (step === 2 && (!date || !time)) return "Escolha uma data e um horario livre.";
    if (step === 3) {
      if (name.trim().length < 3) return "Informe seu nome completo.";
      if (phone.replace(/\D/g, "").length < 10) return "Informe um WhatsApp com DDD.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Informe um e-mail valido.";
    }
    return "";
  }

  async function submitBooking() {
    const error = validateCurrentStep();
    if (error) {
      setNotice(error);
      return;
    }

    setIsSubmitting(true);
    setNotice("");
    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingType, serviceId, date, time, name, phone, email, notes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel concluir a reserva.");
      localStorage.setItem(storageKey, JSON.stringify([...getStoredBookings(), { date, time, serviceId, name, createdAt: new Date().toISOString() }]));
      setResult({ bookingId: data.bookingId, pixPayload: data.pixPayload, emailSent: data.emailSent, scheduleSent: data.scheduleSent });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Nao foi possivel concluir a reserva.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function goNext() {
    const error = validateCurrentStep();
    if (error) {
      setNotice(error);
      return;
    }
    setStep((current) => Math.min(5, current + 1) as Step);
  }

  function chooseBookingType(type: BookingType) {
    setBookingType(type);
    setServiceId(type === "curso" ? courseBookingService.id : services[1].id);
    setTime("");
    setNotice("");
  }

  function startCourseBooking() {
    chooseBookingType("curso");
    setStep(1);
    document.getElementById("agenda")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function copyPix(payload: string) {
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteudo</a>
      <header className="site-header">
        <nav className="nav shell" aria-label="Navegacao principal">
          <a className="brand brand-logo" href="#home" aria-label="Paloma Correa Beauty and Academy">
            <Image src="/Imagens/logo-paloma-correa-texto-CF2AAjzg.png" alt="Paloma Correa Beauty and Academy" width={210} height={50} priority />
          </a>
          <div className="nav-links">
            <a href="#profissional">Profissional</a>
            <a href="#servicos">Servicos</a>
            <a href="#curso">Curso</a>
            <a href="#galeria">Resultados</a>
            <a href="#agenda" className="nav-cta">Agendar</a>
          </div>
        </nav>
      </header>

      <main id="conteudo">
        <section className="hero" id="home">
          <div className="hero-copy shell">
            <p className="eyebrow">Beauty & Academy em Cotia</p>
            <h1>
              <span className="hero-title__first">Cilios com mapeamento</span>
              <span className="hero-title__second">feito para o seu olhar.</span>
            </h1>
            <p>Paloma Correa combina leitura do rosto, tecnica e acabamento limpo para criar cilios confortaveis, elegantes de perto e coerentes com a rotina de cada cliente.</p>
            <div className="hero-actions">
              <a className="button primary" href="#agenda">Agendar horario</a>
              <a className="button secondary" href="#galeria">Ver resultados reais</a>
            </div>
          </div>
          <div className="hero-visual" aria-label="Paloma Correa no studio">
            <Image
              className="hero-photo"
              src="/Imagens/professional-photo-BnAXFWdS.png"
              alt="Paloma segurando escovas de cilios no studio"
              width={900}
              height={1200}
              priority
              sizes="(max-width: 800px) 90vw, 42vw"
            />
            <div className="agenda-orbit-card" aria-label={`Agenda de ${agendaStats.monthLabel}`}>
              <span className="agenda-orbit-card__label">Agenda de</span>
              <strong>{agendaStats.monthLabel}</strong>
              <div>
                <span><b>{agendaStats.daysUntilMonthEnd}</b> dias ate encerrar o mes</span>
                <span><b>{agendaStats.agendaDays}</b> dias disponiveis para atendimento</span>
              </div>
            </div>
          </div>
          <div className="hero-strip shell">
            <span>Analise do olhar</span>
            <span>Aplicacao precisa</span>
            <span>Volumes personalizados</span>
            <span>Curso Power Lash</span>
          </div>
        </section>

        <section className="section intro" id="profissional">
          <div className="shell signature-grid">
            <div className="signature-copy">
              <p className="eyebrow">Metodo Paloma Correa</p>
              <h2>O mapeamento do cilio nasce do seu olhar, nao de uma foto pronta.</h2>
              <p>Antes de falar em volume, a Paloma avalia proporcao, direcao dos fios naturais, rotina e expectativa. O resultado fica mais sofisticado quando a tecnica respeita o rosto da cliente.</p>
            </div>
            <div className="signature-panel" aria-label="Pontos do atendimento">
              {proofNotes.map((item) => (
                <article key={item.value}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </article>
              ))}
            </div>
          </div>
          <div className="shell method-rail">
            {methodSteps.map((item, index) => (
              <article key={item.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section studio-motion">
          <div className="shell studio-motion-copy">
            <p className="eyebrow">Studio em Cotia</p>
            <h2>Um espaco pensado para a cliente ver o cuidado antes mesmo do procedimento comecar.</h2>
            <p>O ambiente precisa transmitir calma, limpeza e atencao aos detalhes. Aqui o video do studio conduz a leitura da secao e mostra onde o atendimento acontece.</p>
          </div>
          <div className="shell atelier-stage">
            <div className="atelier-video atelier-video-featured">
              <video autoPlay muted loop playsInline preload="auto" aria-label="Tour do studio Paloma Lash">
                <source src="/Video/studio-tour-DGCfxHiC.mp4" type="video/mp4" />
              </video>
              <div className="atelier-video-note">
                <span>recepcao organizada</span>
                <span>atendimento com tempo</span>
                <span>higiene visivel no processo</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section services" id="servicos">
          <div className="shell service-suite">
            <div className="service-suite-copy">
              <p className="eyebrow">Escolha pelo efeito no olhar</p>
              <h2>Natural, marcante ou manutencao.</h2>
              <p>Escolha o caminho inicial. A Paloma ajusta curvatura, volume e mapeamento no atendimento.</p>
              <a className="catalog-link" href="/Catalogo/portfolio-lash-paloma-correa.pdf" target="_blank" rel="noopener noreferrer">Ver catalogo de procedimentos</a>
            </div>
            <div className="service-lanes">
              {serviceGroups.map((group) => (
                <article className="service-lane" key={group.title}>
                  <div>
                    <span>{group.title}</span>
                    <p>{group.text}</p>
                  </div>
                  <div className="service-lane-list">
                    {group.ids.map((id) => {
                      const service = services.find((item) => item.id === id);
                      if (!service) return null;
                      return (
                        <a href="#agenda" key={service.id}>
                          <strong>{service.name}</strong>
                          <small>{formatCurrency(service.price)} - {service.duration} min</small>
                        </a>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section gallery-section" id="galeria">
          <div className="shell section-heading gallery-heading">
            <p className="eyebrow">Trabalhos reais</p>
            <h2>Textura, curvatura e acabamento para a cliente comparar.</h2>
          </div>
          <div className="shell gallery-grid">
            {gallery.map((item) => (
              <figure className={getGalleryFigureClassName(item)} key={item.src}>
                {item.kind === "image" ? (
                  <Image src={item.src} alt={item.title} width={760} height={760} sizes="(max-width: 800px) 92vw, 32vw" />
                ) : (
                  <video autoPlay muted loop playsInline preload="auto" poster={item.poster} aria-label={item.title}>
                    <source src={item.src} type="video/mp4" />
                  </video>
                )}
                <figcaption>{item.title}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="section course-section" id="curso">
          <div className="shell course-showcase">
            <figure className="course-portrait">
              <Image src="/Imagens/power-lash-course-B7zmQWup.jpg" alt="Aluna em treinamento de extensao de cilios no curso Power Lash" width={900} height={1100} />
              <figcaption>{course.mode} / {course.durationLabel}</figcaption>
            </figure>

            <div className="course-content">
              <div className="course-kicker">
                <span>Academy presencial</span>
                <strong>{course.priceLabel}</strong>
              </div>
              <h2>Power Lash para iniciar com tecnica, pratica e atendimento seguro.</h2>
              <p>{course.description}</p>

              <div className="course-highlights" aria-label="Detalhes do curso">
                <span>{course.durationLabel}</span>
                <span>Pratica em modelo</span>
                <span>{course.support}</span>
              </div>

              <div className="course-outline">
                <article>
                  <h3>Base tecnica</h3>
                  <p>{course.program.slice(0, 5).join(" / ")}</p>
                </article>
                <article>
                  <h3>Tecnicas ensinadas</h3>
                  <p>{course.techniques.join(" / ")}</p>
                </article>
                <article>
                  <h3>Incluso</h3>
                  <p>{course.included.join(" / ")}</p>
                </article>
              </div>

              <button className="button primary" type="button" onClick={startCourseBooking}>Quero agendar o curso</button>
            </div>
          </div>
        </section>

        <section className="section booking-section" id="agenda">
          <div className="shell booking-grid">
            <div className="booking-copy">
              <p className="eyebrow">Agendamento online</p>
              <h2>Escolha tecnica, data e horario sem depender de troca de mensagens.</h2>
              <p>O calendario consulta a agenda antes de liberar os horarios. No final, a cliente confirma a reserva e recebe o Pix de sinal para garantir o horario.</p>
              <div className="booking-assurance">
                <strong>Como funciona</strong>
                <span>1. Escolha cilios ou curso</span>
                <span>2. Veja horarios livres</span>
                <span>3. Confirme os dados</span>
                <span>4. Finalize a reserva</span>
              </div>
            </div>

            <div className="booking-panel" ref={bookingPanelRef}>
              {result ? (
                <div className="success-state">
                  <span className="status-pill">Reserva criada</span>
                  <h3>{result.bookingId}</h3>
                  <p>Agora e so pagar o sinal de {formatCurrency(PRE_BOOKING_FEE)} pelo Pix para garantir o horario.</p>
                  <QRCodeCanvas value={result.pixPayload} size={190} includeMargin />
                  <button className="button primary" type="button" onClick={() => copyPix(result.pixPayload)}>{copied ? "Pix copiado" : "Copiar Pix"}</button>
                  <small>{result.emailSent || result.scheduleSent ? "A Paloma recebeu os dados da reserva." : "Reserva criada. Configure o webhook ou e-mail no .env para envio automatico."}</small>
                </div>
              ) : (
                <>
                  <div className="wizard-top" aria-label="Etapas do agendamento">
                    {[1, 2, 3, 4, 5].map((item) => (
                      <button key={item} className={item <= step ? "active" : ""} type="button" onClick={() => item < step && setStep(item as Step)}>{item}</button>
                    ))}
                  </div>

                  {notice && <p className="notice" role="alert">{notice}</p>}

                  {step === 1 && (
                    <div className="wizard-step">
                      <h3>O que voce quer agendar?</h3>
                      <div className="booking-type-grid">
                        <button className={bookingType === "cilios" ? "selected" : ""} type="button" onClick={() => chooseBookingType("cilios")}>
                          <span>Cilios</span>
                          <strong>Escolher efeito no olhar</strong>
                          <small>Volume, fio a fio, lash lifting, manutencao ou remocao.</small>
                        </button>
                        <button className={bookingType === "curso" ? "selected" : ""} type="button" onClick={() => chooseBookingType("curso")}>
                          <span>Curso</span>
                          <strong>{course.shortName}</strong>
                          <small>Formacao presencial VIP com pratica em modelo e suporte pos-curso.</small>
                        </button>
                      </div>
                      {bookingType === "cilios" ? (
                        <div className="choice-list">
                          {services.map((service) => (
                            <button className={serviceId === service.id ? "selected" : ""} key={service.id} type="button" onClick={() => { setServiceId(service.id); setTime(""); }}>
                              <span>{service.name}</span>
                              <small>{formatCurrency(service.price)} - {service.duration} min</small>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="course-choice">
                          <span>{course.mode} - {course.durationLabel}</span>
                          <strong>{course.name}</strong>
                          <p>{course.description}</p>
                          <small>{course.priceLabel}. O sinal de reserva aparece somente na ultima etapa.</small>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="wizard-step">
                      <h3>Escolha data e horario</h3>
                      <label className="field">
                        <span>Data</span>
                        <input min={minDate} max={maxDate} value={date} type="date" onChange={(event) => { setDate(event.target.value); setTime(""); }} />
                      </label>
                      {availabilityNote && <p className="availability-note">{availabilityNote}</p>}
                      <div className="time-grid">
                        {isLoadingSlots
                          ? Array.from({ length: 6 }).map((_, index) => <span className="slot-skeleton" key={index} />)
                          : slots.map((slot) => (
                              <button key={slot.time} disabled={!slot.available} className={time === slot.time ? "selected" : ""} type="button" onClick={() => setTime(slot.time)}>
                                <strong>{slot.time}</strong>
                                <span>{slot.status}</span>
                              </button>
                            ))}
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="wizard-step">
                      <h3>Dados para confirmacao</h3>
                      <label className="field"><span>Nome completo</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" /></label>
                      <label className="field"><span>WhatsApp</span><input value={phone} onChange={(event) => setPhone(formatPhone(event.target.value))} placeholder="(11) 99999-9999" /></label>
                      <label className="field"><span>E-mail</span><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" /></label>
                      <label className="field"><span>Observacao</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Alergias, preferencia de efeito ou duvidas" /></label>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="wizard-step">
                      <h3>Confira antes de finalizar</h3>
                      <div className="summary">
                        <p><span>Tipo</span><strong>{isCourseBooking ? "Curso" : "Cilios"}</strong></p>
                        <p><span>{isCourseBooking ? "Curso" : "Procedimento"}</span><strong>{selectedService.name}</strong></p>
                        <p><span>Data</span><strong>{date ? formatStudioDate(date) : "-"}</strong></p>
                        <p><span>Horario</span><strong>{time || "-"}</strong></p>
                        <p><span>Cliente</span><strong>{name || "-"}</strong></p>
                        <p><span>Contato</span><strong>{phone || "-"}</strong></p>
                      </div>
                    </div>
                  )}

                  {step === 5 && (
                    <div className="wizard-step">
                      <h3>Ultima etapa: sinal da reserva</h3>
                      <p className="muted">Para segurar {isCourseBooking ? "a conversa sobre a turma e o atendimento do curso" : "o horario escolhido"}, o site gera um Pix de {formatCurrency(PRE_BOOKING_FEE)} e envia os dados da reserva para a Paloma.</p>
                      <div className="deposit-reveal">
                        <strong>{formatCurrency(PRE_BOOKING_FEE)}</strong>
                        <span>O QR Code real aparece depois da confirmacao, com o numero da sua reserva.</span>
                      </div>
                    </div>
                  )}

                  <div className="wizard-actions">
                    <button className="button secondary" type="button" disabled={step === 1 || isSubmitting} onClick={() => setStep((current) => Math.max(1, current - 1) as Step)}>Voltar</button>
                    {step < 5 ? (
                      <button className="button primary" type="button" onClick={goNext}>Continuar</button>
                    ) : (
                      <button className="button primary" type="button" disabled={isSubmitting} onClick={submitBooking}>{isSubmitting ? "Confirmando..." : "Confirmar reserva"}</button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="section proof">
          <div className="shell proof-grid">
            {testimonials.map((item, index) => (
              <article key={item.quote}>
                <span>0{index + 1}</span>
                <small>{item.label}</small>
                <p>{item.quote}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="shell footer-grid">
          <Image src="/Imagens/logo-paloma-correa-texto-CF2AAjzg.png" alt="Paloma Correa Beauty and Academy" width={240} height={58} />
          <div>
            <strong>Contato</strong>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">{contact.whatsappDisplay}</a>
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
            <span>{contact.location}</span>
          </div>
          <a className="button footer-cta" href="#agenda">Agendar horario</a>
        </div>
      </footer>

      <a className="whatsapp-float" href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Chamar Paloma no WhatsApp">
        <WhatsAppIcon />
      </a>
    </>
  );
}
