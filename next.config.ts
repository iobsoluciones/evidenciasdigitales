import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // ⚠️ IGNORA ERRORES DE TYPESCRIPT - SOLO TEMPORAL
    ignoreBuildErrors: true,
  },
  // Si tienes otras configuraciones, déjalas aquí
};

export default nextConfig;