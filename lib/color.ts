/**
 * CONTRASTE SOBRE EL COLOR DE LA EMPRESA
 * ---------------------------------------------------------------
 * La barra superior se pinta con el color de la empresa activa, y ese
 * color lo elige el consultor: puede ser un azul oscuro o un amarillo
 * claro. Escribir siempre en blanco encima funcionaría en el primero y
 * dejaría la barra ilegible en el segundo.
 *
 * Se decide con la luminancia relativa (WCAG), no «a ojo»: por eso el
 * amarillo `#FFD400` recibe texto oscuro aunque sea un color «vivo».
 *
 * Módulo puro, sin 'use server' ni 'use client': lo importan el layout
 * (servidor) y los componentes de la barra (cliente).
 */

/** '#1B5E4A' o '1B5E4A' → [27, 94, 74]. Null si no es un hex válido. */
function aRgb(hex: string): [number, number, number] | null {
  const limpio = hex.replace('#', '').trim();
  const seis = limpio.length === 3
    ? limpio.split('').map((c) => c + c).join('')
    : limpio;

  if (!/^[0-9a-fA-F]{6}$/.test(seis)) return null;

  return [
    parseInt(seis.slice(0, 2), 16),
    parseInt(seis.slice(2, 4), 16),
    parseInt(seis.slice(4, 6), 16),
  ];
}

/** Luminancia relativa según WCAG 2.1. */
function luminancia(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Color de texto legible sobre `fondo`. El umbral 0.45 se eligió para
 * que los verdes y azules medios —que son los que más usa un SG-SST—
 * caigan del lado del texto blanco.
 */
export function contrasteSobre(fondo: string): string {
  const rgb = aRgb(fondo);
  if (!rgb) return '#ffffff';
  return luminancia(rgb) > 0.45 ? '#14263F' : '#ffffff';
}

/**
 * El mismo color, oscurecido lo justo para que se lea SOBRE BLANCO.
 *
 * El menú lateral marca el módulo activo con el color de la empresa. Con
 * un azul o un verde eso se lee bien; con el amarillo de un restaurante
 * queda invisible. Aquí no se cambia el color de marca —seguiría siendo
 * el suyo— sino que se baja su luminancia hasta que el texto se pueda
 * leer, que es lo que haría un diseñador a mano.
 */
export function paraTexto(color: string): string {
  const rgb = aRgb(color);
  if (!rgb) return color;

  let [r, g, b] = rgb;
  let intentos = 0;
  // 0.35 deja ~4.5:1 contra blanco, que es el mínimo legible de WCAG AA.
  while (luminancia([r, g, b]) > 0.35 && intentos < 12) {
    r = Math.round(r * 0.82);
    g = Math.round(g * 0.82);
    b = Math.round(b * 0.82);
    intentos += 1;
  }

  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** `#1B5E4A` + 0.18 → `rgba(27,94,74,0.18)`. Para velos y bordes. */
export function conAlfa(color: string, alfa: number): string {
  const rgb = aRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alfa})`;
}
