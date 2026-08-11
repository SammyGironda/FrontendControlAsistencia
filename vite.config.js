import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd())

  // Red de seguridad: Vite inlinea TODA variable VITE_* dentro del bundle
  // compilado (por eso existe el prefijo: marca "esto es público"). Compilar
  // con VITE_BYPASS_AUTH=true embebería VITE_BYPASS_PASSWORD en el JavaScript
  // que se sirve al navegador, y además la app auto-loguearía a cualquier
  // visitante. `npm run dev` no se ve afectado.
  if (command === 'build' && env.VITE_BYPASS_AUTH === 'true') {
    throw new Error(
      '\n\n  BUILD ABORTADO: VITE_BYPASS_AUTH=true\n\n' +
      '  El auto-login de desarrollo no puede ir a producción: la contraseña\n' +
      '  de VITE_BYPASS_PASSWORD quedaría embebida en el JavaScript público.\n\n' +
      '  Cambia VITE_BYPASS_AUTH=false en Frontend/.env y vuelve a compilar.\n'
    )
  }

  return {
    plugins: [react()],
  }
})
