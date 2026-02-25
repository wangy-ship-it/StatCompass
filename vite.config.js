import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/components/modules/**', 'src/test/**', 'src/main.tsx'],
      thresholds: {
        'src/utils/**': { statements: 80, branches: 80, functions: 80, lines: 80 },
        'src/hooks/**': { statements: 80, branches: 80, functions: 80, lines: 80 },
        'src/components/ui/**': { statements: 80, branches: 80, functions: 80, lines: 80 },
      },
    },
  },
});
