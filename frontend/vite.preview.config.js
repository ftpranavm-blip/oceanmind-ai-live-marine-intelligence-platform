// Dev-only preview of single pages without login or a canister:
//   vite --config vite.preview.config.js  ->  /preview/coral.html, /preview/iot.html, /preview/ais.html
// Same as vite.config.js except src/hooks/useQueries is replaced by preview/mockQueries.ts.
import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    css: { postcss: './postcss.config.js' },
    // Only scan the preview pages; the full app's index.html imports hooks the stub does not provide.
    optimizeDeps: { entries: ['preview/*.html'] },
    plugins: [
        react(),
        {
            name: 'preview-mock-queries',
            enforce: 'pre',
            resolveId(source, importer) {
                if (/[\\/]hooks[\\/]useQueries$/.test(source) || (source === '../hooks/useQueries' && importer)) {
                    return fileURLToPath(new URL('./preview/mockQueries.ts', import.meta.url));
                }
                return null;
            },
        },
    ],
    resolve: {
        alias: [{ find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }],
    },
});
