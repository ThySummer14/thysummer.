<script setup>
import { ref, onMounted } from 'vue';

const isVisible = ref(false);
const message = ref('');
const type = ref('info');
let timer = null;

const show = (msg, msgType = 'info') => {
  message.value = msg;
  type.value = msgType;
  isVisible.value = true;

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    isVisible.value = false;
  }, 2500);
};

defineExpose({ show });

onMounted(() => {
  // 挂载到全局，允许 Vanilla JS 和 Astro 跨框架调用
  if (typeof window !== 'undefined') {
    window.showToast = show;
  }
});
</script>

<template>
  <div class="toast" :class="{ 'show': isVisible }">
    <span class="icon">{{ type === 'error' ? '🍂' : '✨' }}</span>
    <span class="text">{{ message }}</span>
  </div>
</template>

<style scoped>
.toast {
  position: fixed;
  top: 40px;
  left: 50%;
  transform: translate3d(-50%, -20px, 0);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 50px;
  padding: 14px 28px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 12px 35px rgba(0,0,0,0.05);
  opacity: 0;
  pointer-events: none;
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 9999;
  color: #2C3631;
  display: flex;
  align-items: center;
  gap: 8px;
  will-change: transform, opacity;
}

.toast.show {
  opacity: 1;
  transform: translate3d(-50%, 0, 0);
}
</style>