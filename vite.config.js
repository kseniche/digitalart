import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
    ],
    server: {
        host: '127.0.0.1', // IPv4, чтобы совпадал с хостом Laravel (127.0.0.1:8000) и не было [::1]:5173
        port: 5173,
    },
});