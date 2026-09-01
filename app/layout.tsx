import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rúbrica — Evidencia firmada para el SG-SST",
  description:
    "Administra el Sistema de Gestión de SST de todas tus empresas cliente: " +
    "peligros, capacitaciones, dotación, inspecciones, accidentes, emergencias, " +
    "permisos de alto riesgo y la autoevaluación de la Resolución 0312. " +
    "Cada módulo termina en un documento firmado.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
