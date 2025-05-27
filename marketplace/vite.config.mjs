import { defineConfig, loadEnv } from 'vite';
import { join, resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import checker from 'vite-plugin-checker';

import fs from 'fs';
import moment from 'moment';

import angular from '@analogjs/vite-plugin-angular';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {

  const chainName = mode.split('-')[1] || mode;
  const timestamp = moment().format('MMMD').toLowerCase();

  console.log({ command, mode, chainName })

  // Environment configuration based on mode
  const envConfig = {
    'dev-sepolia': {
      envFile: `environment.${mode}.ts`,
      optimization: false,
      sourcemap: true,
      indexHtml: resolve(__dirname, `src/index.${chainName}.html`)
    },
    'dev-mainnet': {
      envFile: `environment.${mode}.ts`,
      optimization: false,
      sourcemap: true,
      indexHtml: resolve(__dirname, `src/index.${chainName}.html`)
    },
    'sepolia': {
      outDir: resolve(__dirname, `dist/etherphunks-market-${mode}_${timestamp}`),
      envFile: `environment.${mode}.ts`,
      optimization: true,
      sourcemap: false,
      indexHtml: resolve(__dirname, `src/index.${chainName}.html`)
    },
    'mainnet': {
      outDir: resolve(__dirname, `dist/etherphunks-market-${mode}_${timestamp}`),
      envFile: `environment.${mode}.ts`,
      optimization: true,
      sourcemap: false,
      indexHtml: resolve(__dirname, `src/index.${chainName}.html`)
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
    publicDir: '../public',

    resolve: {
      mainFields: ['module', 'browser', 'main'],
      alias: {
        '@': resolve(__dirname, 'src/app'),
        '@scss': resolve(__dirname, 'src/scss'),
        '@app': resolve(__dirname, 'src/app'),
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
        },
        output: {
          manualChunks: {
            'vendor': [
              '@web3modal/wagmi',
              '@xmtp/proto',
              '@ng-select/ng-select'
            ],
            'angular-core': ['@angular/core', '@angular/common', '@angular/platform-browser'],
            'angular-features': ['@angular/router', '@angular/forms']
          }
        }
      },
      modulePreload: true,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 500,
      reportCompressedSize: true,
      assetsInlineLimit: 4096
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
        liveReload: true,
        stylePreprocessorOptions: {
          includePaths: [
            resolve(__dirname, 'src/scss'),
            resolve(__dirname, 'node_modules/@ng-select/ng-select/scss')
          ]
        },
        tsCheckerOptions: {
          overlay: true,
          reportFiles: ['src/**/*.ts'],
          issue: {
            include: [
              {
                file: 'src/**/*.ts',
                severity: 'error'
              }
            ]
          }
        }
      }),
      checker({
        typescript: {
          root: __dirname,
          tsconfigPath: resolve(__dirname, 'tsconfig.app.json'),
        },
        overlay: {
          initialIsOpen: true,
          position: 'tl',
        },
        enableBuild: false
      }),
      visualizer({
        filename: './dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
      {
        name: 'rename-html-after-build',
        closeBundle() {
          if (command !== 'build') return;
          const outDir = currentEnv.outDir;
          const htmlName = `index.${chainName}.html`;
          const src = join(outDir, htmlName);
          const dest = join(outDir, 'index.html');
          if (fs.existsSync(src)) fs.copyFileSync(src, dest);
        }
      }
    ],

    server: {
      port: 4200,
      host: true,
      allowedHosts: ['localhost', '10.0.0.73', '127.0.0.1', '0.0.0.0', 'mac'],
      hmr: {
        overlay: true,
        clientPort: 4200,
      },
      watch: {
        usePolling: true,
        interval: 1000,
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      },
    },

    preview: {
      port: 4200,
      host: true,
    },

    define: {
      'process.version': '"v16.0.0"',
      'process.platform': '"browser"',
      global: 'globalThis'
    },

    optimizeDeps: {
      include: ['@web3modal/wagmi', 'qrcode', 'zone.js', '@ng-select/ng-select', "@xmtp/proto"],
      exclude: ["@xmtp/wasm-bindings", "@xmtp/browser-sdk"],
      cacheDir: 'node_modules/.vite',
      esbuildOptions: {
        target: 'es2020',
        define: {
          global: 'globalThis'
        },
        minify: true,
        treeShaking: true
      }
    }
  };
});
