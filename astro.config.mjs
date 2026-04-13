import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
  // 核心：GitHub Pages 的访问地址
  site: 'https://ThySummer14.github.io',
  // 核心：二级路径名称（必须与你的仓库名完全一致）
  base: '/thysummer.', 
  integrations: [vue()],
});