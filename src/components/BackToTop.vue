<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const visible = ref(false);

const checkScroll = () => {
  visible.value = window.scrollY > 600;
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

onMounted(() => {
  window.addEventListener('scroll', checkScroll, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', checkScroll);
});
</script>

<template>
  <Transition name="fade-up">
    <button v-if="visible" class="back-to-top" @click="scrollToTop" aria-label="回到顶部">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M12 19V5M5 12l7-7 7 7"/>
      </svg>
    </button>
  </Transition>
</template>

<style scoped>
.back-to-top {
  position: fixed;
  bottom: 100px; right: 30px;
  z-index: 900;
  width: 44px; height: 44px;
  border-radius: 50%;
  border: 1px solid var(--glass-border, rgba(255,255,255,0.35));
  background: var(--glass-bg, rgba(255,255,255,0.72));
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  box-shadow: var(--shadow-soft), var(--glass-rim);
  color: var(--accent-color, #8CA192);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all var(--duration-normal, 300ms) var(--cubic-smooth, ease);
}
.back-to-top:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-glow, 0 8px 32px rgba(140,161,146,0.18));
}
.back-to-top:active { transform: translateY(1px) scale(0.95); }
.back-to-top svg { width: 20px; height: 20px; }

.fade-up-enter-active { transition: all var(--duration-normal) var(--ease-out-back); }
.fade-up-leave-active { transition: all 0.2s ease; }
.fade-up-enter-from { opacity: 0; transform: translateY(12px); }
.fade-up-leave-to { opacity: 0; transform: translateY(8px); }

@media (max-width: 768px) {
  .back-to-top { bottom: 90px; right: 16px; width: 40px; height: 40px; }
}
</style>
