import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import path from "path"

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        // for dicom-parser
        viteCommonjs(),
    ],
    resolve: {
        alias: {
        "@": path.resolve(__dirname, "./src"),
        },
    },

    assetsInclude: ['**/*.wasm'],
    // seems like only required in dev mode
    optimizeDeps: {
        exclude: ['@cornerstonejs/dicom-image-loader'],
        include: ['dicom-parser'],
    },
    worker: {
        format: 'es',
    },
    server: {
        host: true
    },
})
