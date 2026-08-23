'use client';

/**
 * LIENZO DE FIRMA
 * ---------------------------------------------------------------
 * Componente reutilizable para el asistente y para el instructor.
 *
 * LECCIÓN APRENDIDA (del sistema en Apps Script): el lienzo debe
 * pintarse con FONDO BLANCO antes de dibujar. Si se deja transparente,
 * la firma se ve mal al incrustarla en el PDF.
 *
 * Expone `obtenerBlob()` al componente padre mediante una referencia,
 * para que este decida cuándo subir la imagen.
 */
import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

export type LienzoFirmaRef = {
  /** Devuelve la firma como PNG, o null si no se dibujó nada. */
  obtenerBlob: () => Promise<Blob | null>;
  limpiar: () => void;
  tieneFirma: () => boolean;
};

const LienzoFirma = forwardRef<LienzoFirmaRef, { color?: string }>(
  function LienzoFirma({ color = '#1e3a8a' }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dibujando = useRef(false);
    const [hayFirma, setHayFirma] = useState(false);

    // Fondo blanco al montar
    useEffect(() => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
    }, []);

    function limpiar() {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      setHayFirma(false);
    }

    useImperativeHandle(ref, () => ({
      tieneFirma: () => hayFirma,
      limpiar,
      obtenerBlob: () =>
        new Promise<Blob | null>((resolve) => {
          if (!hayFirma || !canvasRef.current) return resolve(null);
          canvasRef.current.toBlob((b) => resolve(b), 'image/png');
        }),
    }));

    /**
     * Convierte coordenadas del puntero a coordenadas internas del
     * lienzo. Hace falta porque el CSS lo escala y, sin esta
     * conversión, el trazo aparece desplazado.
     */
    function pos(e: React.MouseEvent | React.TouchEvent) {
      const c = canvasRef.current!;
      const r = c.getBoundingClientRect();
      const p = 'touches' in e ? e.touches[0] : e;
      return {
        x: (p.clientX - r.left) * (c.width / r.width),
        y: (p.clientY - r.top) * (c.height / r.height),
      };
    }

    function iniciar(e: React.MouseEvent | React.TouchEvent) {
      e.preventDefault();
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      dibujando.current = true;
      setHayFirma(true);
      const { x, y } = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function trazar(e: React.MouseEvent | React.TouchEvent) {
      if (!dibujando.current) return;
      e.preventDefault();
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const { x, y } = pos(e);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    function terminar() {
      dibujando.current = false;
    }

    return (
      <div>
        <canvas
          ref={canvasRef}
          width={440}
          height={180}
          onMouseDown={iniciar}
          onMouseMove={trazar}
          onMouseUp={terminar}
          onMouseLeave={terminar}
          onTouchStart={iniciar}
          onTouchMove={trazar}
          onTouchEnd={terminar}
          style={{
            width: '100%',
            border: '2px dashed #cbd5e1',
            borderRadius: 8,
            background: '#fff',
            touchAction: 'none',
            cursor: 'crosshair',
            display: 'block',
          }}
        />
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <button
            type="button"
            onClick={limpiar}
            style={{
              background: '#f1f5f9', border: '1px solid #cbd5e1',
              color: '#1f2937', padding: '7px 16px', borderRadius: 6,
              fontSize: 13, cursor: 'pointer',
            }}
          >
            Limpiar
          </button>
        </div>
      </div>
    );
  }
);

export default LienzoFirma;
