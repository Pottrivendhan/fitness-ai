import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [react()],
        server: {
            port: 5173,
            host: '0.0.0.0',
            strictPort: false,
            proxy: {
                '/api': {
                    target: env.VITE_API_URL || 'http://localhost:8000',
                    changeOrigin: true,
                    rewrite: function (path) { return path.replace(/^\/api/, ''); }
                },
                '/uploads': {
                    target: env.VITE_API_URL || 'http://localhost:8000',
                    changeOrigin: true
                }
            }
        },
        build: {
            outDir: 'dist',
            sourcemap: false,
            minify: 'esbuild',
            chunkSizeWarningLimit: 1000,
            rollupOptions: {
                output: {
                    manualChunks: {
                        'react-vendors': ['react', 'react-dom', 'react-router-dom'],
                        'ui-vendors': ['framer-motion', 'recharts', 'react-icons'],
                        'form-vendors': ['react-hook-form', 'zod']
                    }
                }
            }
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@components': path.resolve(__dirname, './src/components'),
                '@pages': path.resolve(__dirname, './src/pages'),
                '@store': path.resolve(__dirname, './src/store'),
                '@services': path.resolve(__dirname, './src/services'),
                '@hooks': path.resolve(__dirname, './src/hooks'),
                '@utils': path.resolve(__dirname, './src/utils'),
                '@types': path.resolve(__dirname, './src/types'),
                '@styles': path.resolve(__dirname, './src/styles')
            }
        },
        css: {
            postcss: './postcss.config.js'
        }
    };
});
