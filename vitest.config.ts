import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.base';
import path from 'path';

export default mergeConfig(viteConfig, defineConfig({
    resolve: {
        alias: [
            {
                find: /.+\.(css|less|scss|sass|styl|stylus|pcss|postcss)$/,
                replacement: path.resolve(__dirname, 'src/test/styleMock.ts'),
            },
            {
                find: 'webextension-polyfill',
                replacement: path.resolve(__dirname, 'src/__mocks__/webextension-polyfill.ts'),
            },
        ],
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
    }
}));