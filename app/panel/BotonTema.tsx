'use client';

/**
 * INTERRUPTOR DE TEMA
 * ---------------------------------------------------------------
 * Va junto a Salir porque los dos son de la sesión, no del trabajo:
 * ninguno tiene que ver con la empresa activa ni con el módulo abierto.
 *
 * El tema real lo aplica el script del layout raíz antes del primer
 * pintado. Este botón solo lo cambia y lo guarda. Por eso arranca en
 * `null` y no adivina cuál es: el servidor no puede saber qué tiene
 * guardado el navegador, y pintar un sol donde luego va una luna sería
 * un parpadeo en cada carga. Hasta que monta, muestra el icono neutro.
 */
import { useEffect, useState } from 'react';

type Tema = 'claro' | 'oscuro';

export default function BotonTema({ contraste }: { contraste: string }) {
  const [tema, setTema] = useState<Tema | null>(null);

  useEffect(() => {
    const actual = document.documentElement.dataset.tema;
    setTema(actual === 'oscuro' ? 'oscuro' : 'claro');
  }, []);

  function cambiar() {
    const nuevo: Tema = tema === 'oscuro' ? 'claro' : 'oscuro';
    document.documentElement.dataset.tema = nuevo;
    try {
      localStorage.setItem('tema', nuevo);
    } catch {
      // Navegación privada o almacenamiento bloqueado: el tema vale
      // para esta pestaña y no se guarda. Mejor eso que reventar.
    }
    setTema(nuevo);
  }

  const oscuro = tema === 'oscuro';
  const trazo = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <button
      onClick={cambiar}
      title={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      aria-label={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      aria-pressed={oscuro}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 34, height: 34, padding: 0, borderRadius: 8,
        background: 'transparent',
        border: `1px solid ${contraste === '#ffffff' ? 'rgba(255,255,255,.45)' : 'rgba(20,38,63,.28)'}`,
        color: contraste, cursor: 'pointer', flexShrink: 0,
      }}
    >
      <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
        {oscuro ? (
          // Luna: el tema que está puesto ahora.
          <path d="M14.6 11.2A5.8 5.8 0 0 1 6.8 3.4a5.8 5.8 0 1 0 7.8 7.8z" {...trazo} />
        ) : (
          // Sol.
          <>
            <circle cx="9" cy="9" r="3.4" {...trazo} />
            <path d="M9 1.6v1.8M9 14.6v1.8M1.6 9h1.8M14.6 9h1.8M3.8 3.8l1.3 1.3M12.9 12.9l1.3 1.3M14.2 3.8l-1.3 1.3M5.1 12.9l-1.3 1.3" {...trazo} />
          </>
        )}
      </svg>
    </button>
  );
}
