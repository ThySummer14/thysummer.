<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { appState } from '../store/state.js';

const isOpen = ref(false);
const currentIndex = ref(0);
const isZoomed = ref(false);
const isSlideshow = ref(false);
let slideshowTimer = null;

const photos = computed(() => appState.photos);
const currentPhoto = computed(() => photos.value[currentIndex.value] || null);

const open = (photoId) => {
  const idx = photos.value.findIndex(p => p.id === photoId);
  if (idx === -1) return;
  currentIndex.value = idx;
  isOpen.value = true;
  isZoomed.value = false;
  document.body.style.overflow = 'hidden';
};

const close = () => {
  stopSlideshow();
  isOpen.value = false;
  isZoomed.value = false;
  document.body.style.overflow = '';
};

const prev = () => {
  if (currentIndex.value > 0) currentIndex.value--;
  else currentIndex.value = photos.value.length - 1; // loop
  isZoomed.value = false;
};

const next = () => {
  if (currentIndex.value < photos.value.length - 1) currentIndex.value++;
  else currentIndex.value = 0; // loop
  isZoomed.value = false;
};

// Slideshow
const toggleSlideshow = () => {
  if (isSlideshow.value) { stopSlideshow(); return; }
  isSlideshow.value = true;
  isZoomed.value = false;
  slideshowTimer = setInterval(next, 4000);
};
const stopSlideshow = () => {
  isSlideshow.value = false;
  if (slideshowTimer) { clearInterval(slideshowTimer); slideshowTimer = null; }
};

// Download
const downloadPhoto = async () => {
  if (!currentPhoto.value) return;
  try {
    const res = await fetch(currentPhoto.value.image_url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPhoto.value.title || '拾光'}.${blob.type.split('/')[1] || 'jpg'}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // fallback: open in new tab
    window.open(currentPhoto.value.image_url, '_blank');
  }
};

// Keyboard navigation
const handleKey = (e) => {
  if (!isOpen.value) return;
  if (e.key === 'Escape') close();
  else if (e.key === 'ArrowLeft') { stopSlideshow(); prev(); }
  else if (e.key === 'ArrowRight') { stopSlideshow(); next(); }
  else if (e.key === ' ') { e.preventDefault(); toggleSlideshow(); }
};

// Touch swipe
let touchStartX = 0;
let touchStartY = 0;
const handleTouchStart = (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
};
const handleTouchEnd = (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
  stopSlideshow();
  if (dx > 0) prev();
  else next();
};

onMounted(() => {
  document.addEventListener('keydown', handleKey);
  if (typeof window !== 'undefined') {
    window.openLightbox = open;
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKey);
  stopSlideshow();
  document.body.style.overflow = '';
});
</script>

<template>
  <Transition name="lightbox">
    <div v-if="isOpen" class="lightbox-mask" @click.self="close"
         @touchstart.passive="handleTouchStart" @touchend.passive="handleTouchEnd">

      <button class="lb-close" @click="close" aria-label="关闭">×</button>

      <div class="lb-toolbar">
        <button class="lb-tool" @click.stop="downloadPhoto" aria-label="下载">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12l7 7 7-7"/><path d="M5 19h14"/></svg>
        </button>
        <button class="lb-tool" :class="{ active: isSlideshow }" @click.stop="toggleSlideshow" aria-label="幻灯片">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon v-if="!isSlideshow" points="5,3 19,12 5,21"/><path v-else d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
        </button>
      </div>

      <button v-if="currentIndex > 0 || isSlideshow" class="lb-nav lb-prev" @click.stop="() => { stopSlideshow(); prev(); }" aria-label="上一张">‹</button>

      <div class="lb-content" @click.stop="isZoomed = !isZoomed">
        <img
          v-if="currentPhoto"
          :src="currentPhoto.image_url"
          :alt="currentPhoto.title || '照片'"
          :class="{ zoomed: isZoomed }"
          draggable="false"
        />
      </div>

      <button v-if="currentIndex < photos.length - 1 || isSlideshow" class="lb-nav lb-next" @click.stop="() => { stopSlideshow(); next(); }" aria-label="下一张">›</button>

      <div v-if="currentPhoto" class="lb-caption">
        <span class="lb-title">{{ currentPhoto.title }}</span>
        <span class="lb-counter">{{ currentIndex + 1 }} / {{ photos.length }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.lightbox-mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}

.lb-close {
  position: absolute;
  top: 20px; right: 24px;
  background: none; border: none;
  color: rgba(255,255,255,0.8);
  font-size: 36px; line-height: 1;
  cursor: pointer;
  transition: opacity var(--duration-fast);
  z-index: 10;
}
.lb-close:hover { opacity: 0.6; }

.lb-toolbar {
  position: absolute;
  top: 20px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 8px; z-index: 10;
}
.lb-tool {
  width: 40px; height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all var(--duration-normal);
}
.lb-tool svg { width: 18px; height: 18px; }
.lb-tool:hover { background: rgba(255,255,255,0.18); }
.lb-tool.active { background: var(--accent-color, #8CA192); border-color: transparent; }

.lb-nav {
  position: absolute;
  top: 50%; transform: translateY(-50%);
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 50%;
  width: 48px; height: 48px;
  color: white; font-size: 28px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all var(--duration-normal);
  z-index: 10;
}
.lb-nav:hover { background: rgba(255,255,255,0.2); }
.lb-prev { left: 20px; }
.lb-next { right: 20px; }

.lb-content {
  max-width: 90vw; max-height: 85vh;
  display: flex; align-items: center; justify-content: center;
  cursor: zoom-in;
}
.lb-content img {
  max-width: 90vw; max-height: 82vh;
  object-fit: contain;
  border-radius: 4px;
  transition: transform var(--duration-normal) var(--ease-out-expo);
  user-select: none;
}
.lb-content img.zoomed {
  transform: scale(1.8);
  cursor: zoom-out;
}

.lb-caption {
  position: absolute;
  bottom: 24px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 16px;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 50px;
  padding: 10px 24px;
  color: rgba(255,255,255,0.85);
  font-size: 13px;
}
.lb-title { font-weight: 500; }
.lb-counter { opacity: 0.6; font-size: 12px; }

/* Transition */
.lightbox-enter-active { transition: opacity var(--duration-normal) ease; }
.lightbox-leave-active { transition: opacity 0.2s ease; }
.lightbox-enter-from, .lightbox-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .lb-nav { width: 40px; height: 40px; font-size: 22px; }
  .lb-prev { left: 10px; }
  .lb-next { right: 10px; }
  .lb-caption { padding: 8px 18px; font-size: 12px; }
}
</style>
