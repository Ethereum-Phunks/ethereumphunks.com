import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import angular from '@analogjs/vite-plugin-angular';
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  // Environment configuration based on mode
  const envConfig = {
    'dev-sepolia': {
      outDir: '../dist/etherphunks-market',
      envFile: 'environment.dev-sepolia.ts',
      optimization: false,
      sourcemap: true
    },
    'dev-mainnet': {
      outDir: '../dist/etherphunks-market',
      envFile: 'environment.dev-mainnet.ts',
      optimization: false,
      sourcemap: true
    },
    'sepolia': {
      outDir: '../dist/etherphunks-market-sepolia_may18',
      envFile: 'environment.sepolia.ts',
      optimization: true,
      sourcemap: false,
      indexHtml: 'src/index.sepolia.html'
    },
    'mainnet': {
      outDir: '../dist/etherphunks-market-mainnet_may18',
      envFile: 'environment.mainnet.ts',
      optimization: true,
      sourcemap: false,
      indexHtml: 'src/index.mainnet.html'
    }
  };

  const currentEnv = envConfig[mode] || envConfig['dev-sepolia'];

  // Handle environment file replacement
  if (currentEnv.envFile) {
    const envFilePath = resolve(__dirname, 'src/environments', currentEnv.envFile);
    const defaultEnvPath = resolve(__dirname, 'src/environments/environment.ts');

    if (fs.existsSync(envFilePath)) {
      fs.copyFileSync(envFilePath, defaultEnvPath);
    }
  }

  return {
    root: 'src',
    base: '/',
    publicDir: 'assets',

    resolve: {
      mainFields: ['module', 'browser', 'main'],
      alias: {
        '@': resolve(__dirname, 'src/app'),
        '@scss': resolve(__dirname, 'src/scss'),
        '@app': resolve(__dirname, 'src/app'),
        '@assets': resolve(__dirname, 'src/assets'),
        '@environments': resolve(__dirname, 'src/environments'),
        'abstracts': resolve(__dirname, 'src/scss/abstracts'),
        'qrcode': resolve(__dirname, 'node_modules/qrcode/lib/browser.js'),
        'tippy.js': resolve(__dirname, 'node_modules/tippy.js'),
        '@ng-select/ng-select': resolve(__dirname, 'node_modules/@ng-select/ng-select')
      }
    },

    build: {
      outDir: currentEnv.outDir,
      emptyOutDir: true,
      target: 'es2020',
      sourcemap: currentEnv.sourcemap,
      minify: currentEnv.optimization ? 'esbuild' : false,
      rollupOptions: {
        input: {
          main: currentEnv.indexHtml || resolve(__dirname, 'src/index.html')
        }
      }
    },

    css: {
      preprocessorOptions: {
        scss: {
          includePaths: [
            resolve(__dirname, 'src/scss'),
            resolve(__dirname, 'node_modules'),
            resolve(__dirname, 'node_modules/@ng-select/ng-select/scss')
          ],
          additionalData: `
            @use "@scss/abstracts/_variables" as *;
            @use "@scss/abstracts/_mixins" as *;
          `
        }
      }
    },

    plugins: [
      angular({
        inlineStylesExtension: 'scss',
        entryFile: resolve(__dirname, 'src/main.ts'),
        tsconfig: resolve(__dirname, 'tsconfig.app.json'),
        workspaceRoot: __dirname,
        stylePreprocessorOptions: {
          includePaths: [
            resolve(__dirname, 'src/scss'),
            resolve(__dirname, 'node_modules/@ng-select/ng-select/scss')
          ]
        }
      })
    ],

    server: {
      port: 4200,
      host: true,
    },

    preview: {
      port: 4200,
      host: true,
    },

    define: {
      'process.env': env,
      'process.version': '"v16.0.0"',
      'process.platform': '"browser"',
      global: 'globalThis'
    },

    optimizeDeps: {
      include: ['@web3modal/wagmi', 'qrcode', 'zone.js', '@ng-select/ng-select'],
      esbuildOptions: {
        target: 'es2020',
        define: {
          global: 'globalThis'
        }
      }
    }
  };
});
