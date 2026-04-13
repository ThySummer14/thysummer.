import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
  // ✨ 核心修正：即便仓库名带点，base 的最后也必须补上斜杠
  base: '/thysummer./', 
  integrations: [vue()],
});
