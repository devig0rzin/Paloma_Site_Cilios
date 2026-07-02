export const depositAmount = 1;

export const contact = {
  whatsapp: "5511989927677",
  whatsappDisplay: "(11) 98992-7677",
  email: "palomasantoslv2@gmail.com",
  location: "Cotia, SP - 06708-235",
  whatsappMessage: "Ola! Gostaria de agendar um servico ou saber mais sobre os cursos.",
};

export const services = [
  { id: "fio-a-fio", name: "Fio a fio natural", price: 120, duration: 120, description: "Aplicacao leve para realcar o olhar com acabamento delicado e natural." },
  { id: "volume-brasileiro", name: "Volume brasileiro", price: 150, duration: 140, description: "Preenchimento elegante, fios bem alinhados e curvatura com presenca." },
  { id: "volume-russo", name: "Volume russo", price: 180, duration: 160, description: "Tecnica para quem busca um olhar mais marcante, denso e sofisticado." },
  { id: "lash-lifting", name: "Lash lifting", price: 95, duration: 75, description: "Curvatura dos fios naturais para um resultado limpo e de baixa manutencao." },
  { id: "manutencao", name: "Manutencao", price: 85, duration: 90, description: "Reposicao tecnica para manter simetria, durabilidade e acabamento bonito." },
  { id: "remocao", name: "Remocao segura", price: 45, duration: 40, description: "Retirada cuidadosa para preservar os fios naturais sem desconforto." },
] as const;

export const course = {
  id: "curso-power-lash-vip",
  name: "Curso Power Lash - Iniciante VIP",
  shortName: "Power Lash VIP",
  mode: "Presencial",
  support: "Suporte pos-curso",
  durationLabel: "2 dias",
  priceLabel: "Consultar valor",
  duration: 480,
  description:
    "Formacao presencial para mulheres que querem iniciar como Lash Designer com base tecnica, pratica em modelo e acompanhamento depois do curso.",
  program: [
    "Biosseguranca e higienizacao",
    "Mapeamento e visagismo",
    "Doencas oculares",
    "Tamanho, espessura e curvaturas",
    "Acoplagem e retencao",
    "Tricologia e isolamento",
    "Trabalho em camadas e remocao",
    "pH do fio e da pele",
    "Volumes tendencia",
  ],
  techniques: ["Fio a fio", "Mega brasileiro", "Volume brasileiro", "Volume Loma", "Volume egipcio", "Lash Designer", "Efeito Fox", "Efeito Sereia"],
  included: ["2 dias de curso teorico e pratico em modelo", "Material didatico completo", "Certificado de conclusao", "Suporte pos-curso exclusivo", "Coffee-break"],
} as const;

export const courseBookingService = {
  id: course.id,
  name: course.name,
  price: 0,
  duration: course.duration,
  description: course.description,
} as const;

export const bookableServices = [...services, courseBookingService] as const;

export const professionals = [
  { id: "paloma", name: "Paloma", specialties: "Mapeamento personalizado, volume brasileiro e acabamento natural" },
] as const;

export const availableTimes = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00", "18:30"];

export function isClosedDay(date: string) {
  const day = new Date(`${date}T00:00:00`).getDay();
  return day === 0 || day === 1;
}

export function getAvailableTimesForDate(date: string) {
  const day = new Date(`${date}T00:00:00`).getDay();
  if (day === 6) return availableTimes.filter((time) => Number(time.slice(0, 2)) <= 15);
  return availableTimes;
}

export function canFitServiceAtTime(time: string, date: string, duration: number) {
  const [hours, minutes] = time.split(":").map(Number);
  const closingHour = new Date(`${date}T00:00:00`).getDay() === 6 ? 17 : 20;
  const startMinutes = hours * 60 + minutes;
  const closingMinutes = closingHour * 60;
  return startMinutes + duration <= closingMinutes;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
