import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    // firebase (~790 kB) and the on-demand PDF library (~980 kB) are big by nature
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Libraries change far less often than app code; separate chunks stay cached across deploys
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase';
          // Icons included: otherwise each icon becomes its own tiny request
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|lucide-react)\//.test(id)) return 'vendor';
        },
      },
    },
  },
});
