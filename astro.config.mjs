import process from 'node:process'
import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel/serverless'
import cloudflare from '@astrojs/cloudflare'
import netlify from '@astrojs/netlify'
import node from '@astrojs/node'
import { provider } from 'std-env'
import sentry from '@sentry/astro'

const providers = {
  vercel: vercel({
    isr: {
      expiration: 60 * 30,
    },
    edgeMiddleware: false,
    functionPerRoute: false,
    imageService: true,
    devImageService: 'sharp',
    runtime: 'nodejs20.x',
  }),
  cloudflare_pages: cloudflare({
    mode: 'directory',
    imageService: 'compile',
    routes: {
      strategy: 'include',
      include: ['/*'],
      exclude: [
        '/favicon.ico',
        '/robots.txt',
        '/api/update-cache', // Only exclude if handled by separate worker, but let's keep it safe
        '/.env',
        '/.git*',
        '/wp-admin*',
        '/wp-content*',
        '/*.php',
        '/*.asp',
        '/*.jsp',
        '/*.yml',
        '/*.yaml',
        '/*.sql',
        '/*.zip',
        '/*.tgz',
        '/*.gz',
        '/*.rar',
        '/*.bak',
        '/*.7z'
      ]
    }
  }),
  netlify: netlify({
    cacheOnDemandPages: false,
    edgeMiddleware: false,
  }),
  node: node({
    mode: 'standalone',
  }),
}

const adapterProvider = process.env.SERVER_ADAPTER || provider

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: providers[adapterProvider] || providers.node,
  integrations: [
    ...(process.env.SENTRY_DSN
      ? [
        sentry({
          enabled: {
            client: false,
            server: !!process.env.SENTRY_DSN,
          },
          dsn: process.env.SENTRY_DSN,
          sourceMapsUploadOptions: {
            enabled: process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
          },
        }),
      ]
      : []),
  ],
  vite: {
    ssr: {
      noExternal: process.env.DOCKER ? !!process.env.DOCKER : undefined,
      external: adapterProvider === 'cloudflare_pages'
        ? ['node:fs', 'node:path', 'fs', 'path']
        : [],
    },
  },
})
