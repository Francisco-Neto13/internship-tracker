import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Identidade visual "Navy Confiança" (documentation/design/internship-tracker-identidade-visual.pdf).
// Inter substitui o par Public Sans (titulo) + DM Sans (corpo) em 2026-09-23, por decisao do
// time: uma familia so para titulo e corpo, com as mesmas metricas nos dois, e a mesma face que
// os tres projetos de referencia usam. Variavel: um arquivo cobre todos os pesos.
// JetBrains Mono continua nos codigos (RF/RN/M0x, matricula, codigo de curso), onde o
// espacamento fixo alinha coluna de tabela — nao e escolha de marca, e funcao.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Internship Tracker",
  description: "Acompanhamento de estágios e atividades complementares",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
