/// <reference types="astro/client" />

// 告诉 TypeScript：把所有 .vue 文件都当成标准的 Vue 组件来对待
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}