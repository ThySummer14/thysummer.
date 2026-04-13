import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
  // ✨ 重点：末尾的斜杠是文件夹的分界线，必须保留
  base: '/thysummer./', 
  integrations: [vue()],
  // 如果你有其他配置（如 site），请保留在下方
});
