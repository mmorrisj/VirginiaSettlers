import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // The workspace packages are consumed as TypeScript source, so Vite must not
  // try to pre-bundle them as prebuilt dependencies.
  optimizeDeps: { exclude: ['@vs/sim', '@vs/content'] },
  build: { target: 'es2022' },
})
