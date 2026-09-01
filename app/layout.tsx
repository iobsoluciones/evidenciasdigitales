import type { Metadata } from "next";
import Script from "next/script";
import { Source_Sans_3 } from "next/font/google";
import "./globales.css";

/**
 * La aplicación no tenía tipografía declarada: el `body` caía en la
 * fuente por omisión del navegador —Times New Roman— y solo algunos
 * componentes sueltos pedían otra. Source Sans 3 es una fuente de
 * interfaz y de documento a la vez, que es exactamente lo que hace
 * esta aplicación: pantallas de captura y actas que se imprimen.
 * Aguanta bien los 12-13 px de las tablas y tiene los acentos y la eñe
 * bien dibujados, que no es un detalle menor en español.
 */
const fuente = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Rúbrica — Evidencia firmada para el SG-SST",
  description:
    "Administra el Sistema de Gestión de SST de todas tus empresas cliente: " +
    "peligros, capacitaciones, dotación, inspecciones, accidentes, emergencias, " +
    "permisos de alto riesgo y la autoevaluación de la Resolución 0312. " +
    "Cada módulo termina en un documento firmado.",
};

/**
 * El tema se aplica ANTES de que el navegador pinte.
 *
 * Va como script en línea y no como efecto de React a propósito: un
 * efecto corre después del primer pintado, así que quien tiene el tema
 * oscuro vería un fogonazo blanco en cada carga. Y va aquí y no en una
 * cookie leída en el servidor porque leer cookies en el layout raíz
 * volvería dinámicas también la página comercial y los enlaces
 * públicos de firma, que hoy son estáticos.
 *
 * Sin preferencia guardada se respeta la del sistema operativo.
 */
const TEMA_INICIAL = `
try {
  var t = localStorage.getItem('tema');
  if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  document.documentElement.dataset.tema = t;
} catch (e) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // `suppressHydrationWarning` porque el script de arriba escribe
    // `data-tema` antes de que React hidrate: el HTML del servidor y el
    // del navegador difieren A PROPÓSITO en ese atributo. Solo silencia
    // este elemento, no el árbol entero.
    <html lang="es" className={fuente.className} suppressHydrationWarning>
      <body>
        <Script
          id="tema-inicial"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: TEMA_INICIAL }}
        />
        {children}
      </body>
    </html>
  );
}
