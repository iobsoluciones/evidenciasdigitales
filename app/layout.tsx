import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sistema de Asistencia",
  description: "Gestion de asistencia a capacitaciones",
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
