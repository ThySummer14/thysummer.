import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
  // ✨ 终极路由底座：斜杠封尾，雷打不动
  base: '/thysummer./', 
  integrations: [vue()],
});
