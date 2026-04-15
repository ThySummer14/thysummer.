<script setup>
import { ref, onMounted } from 'vue';

const containerRef = ref(null);

onMounted(() => {
  // SSR 安全防线：确保仅在客户端运行
  if (!containerRef.value || typeof window === 'undefined') return;
  
  const count = window.innerWidth <= 600 ? 15 : 25;
  const frag = document.createDocumentFragment();

  // 原生构建 DOM 节点，保障 60fps 满帧
  for (let i = 0; i < count; i++) {
    const m = document.createElement('i');
    m.className = 'mote';
    
    // ✨ 审美升级：尺寸放大，生成 4px - 12px 的错落光斑
    const size = Math.random() * 8 + 4; 
    m.style.width = size + 'px';
    m.style.height = size + 'px';
    m.style.left = Math.random() * 100 + 'vw';
    
    // 随机上升速度与延迟，让运动更舒缓
    m.style.animationDuration = (Math.random() * 15 + 12) + 's';
    m.style.animationDelay = (Math.random() * 8) + 's';
    
    frag.appendChild(m);
  }
  containerRef.value.appendChild(frag);
});
</script>

<template>
  <div ref="containerRef" class="bg-fx-container"></div>
</template>

<style scoped>
.bg-fx-container {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1; 
}
</style>

<style>
.mote {
  position: absolute;
  bottom: -10%;
  
  /* ✨ 审美升级：更浅、更柔和的晨雾浅绿 */
  background: #AEC3B6; 
  border-radius: 50%;
  opacity: 0;
  
  /* 开启 GPU 硬件加速 */
  will-change: transform, opacity;
  animation: floatUp linear infinite;
  
  /* ✨ 审美升级：扩散发光半径，降低发光强度，形成“散景”感 */
  box-shadow: 0 0 18px rgba(174, 195, 182, 0.4); 
}

/* 严禁操作 top/left，仅使用 transform: translate3d 防重排 */
@keyframes floatUp {
  0% { transform: translate3d(0, 0, 0) scale(0.8); opacity: 0; }
  /* ✨ 审美升级：最高透明度降至 0.5，让光斑若隐若现，极致耐看 */
  25% { opacity: 0.5; }
  75% { opacity: 0.5; }
  100% { transform: translate3d(8vw, -110vh, 0) scale(1.8); opacity: 0; }
}
</style>