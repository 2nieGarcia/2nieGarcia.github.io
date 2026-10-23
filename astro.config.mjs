// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://2nieGarcia.github.io',

  image: {
    // project screenshots are optimized at build time, never hotlinked
    domains: ['raw.githubusercontent.com'],
  },

  integrations: [react()],
});