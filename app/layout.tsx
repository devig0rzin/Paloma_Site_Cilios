import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lashpaloma.vercel.app"),
  title: "Paloma Lash Studio | Cilios e agendamento online",
  description: "Studio de extensao de cilios com agendamento online, reserva por Pix de R$ 1 e confirmacao por e-mail.",
  openGraph: {
    title: "Paloma Lash Studio",
    description: "Agende seu horario de cilios com reserva online simples e segura.",
    type: "website",
    images: [{ url: "/Imagens/professional-photo-BnAXFWdS.jpg", width: 1200, height: 630, alt: "Paloma Lash Studio" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
