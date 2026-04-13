<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  photo: { type: Object, required: true },
  aspectRatio: { type: Number, default: 0.75 }
});

const isFlipped = ref(false);

const toggleFlip = () => {
  isFlipped.value = !isFlipped.value;
};

// 生成 100% / 比例 的撑开高度，防止图片加载引起的重排 (Anti-CLS)
const paddingBottom = computed(() => `${100 / props.aspectRatio}%`);
// 生成散落美学的随机角度
const randomAngle = computed(() => `${(Math.random() * 4 - 2).toFixed(2)}deg`);
</script>

<template>
  <div class="card-wrapper is-visible" :style="`--random-angle: ${randomAngle};`">
    <div class="card-inner" :class="{ 'is-flipped': isFlipped }" @click="toggleFlip">
      
      <div class="card-front">
        <div class="img-container" :style="{ paddingBottom }">
          <img :src="photo.image_url" loading="lazy" decoding="async" alt="记忆碎片" />
        </div>
        <div class="card-content">
          <p class="photo-desc" v-if="photo.description">{{ photo.description }}</p>
          <div class="card-meta">
            <span>{{ new Date(photo.created_at).toLocaleDateString() }}</span>
          </div>
        </div>
      </div>

      <div class="card-back" @click.stop>
        <div class="back-header">拾光回音</div>
        <div class="comments-list">
          <div class="empty-comment-tip">信笺背面空空如也，留下第一道印记吧。</div>
          </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* =========================================
   极致 3D 架构与性能回归 (源自原生设计系统)
   ========================================= */
.card-wrapper {
  break-inside: avoid; 
  /* 强制提拔为 GPU 复合层，拯救滚动掉帧 */
  transform: translate3d(0, 0, 0); 
  will-change: opacity, transform; 
  perspective: 1200px;
  opacity: 0;
  transition: opacity 0.7s ease, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card-wrapper.is-visible { 
  opacity: 1; 
  transform: translate3d(0, 0, 0) rotate(var(--random-angle, 0deg)); 
}

.card-inner { 
  position: relative; 
  width: 100%; 
  transform-style: preserve-3d; 
  transition: transform 0.85s cubic-bezier(0.34, 1.56, 0.64, 1); 
  cursor: pointer; 
  border-radius: 18px; 
  will-change: transform; 
  background: white;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}

.card-inner.is-flipped { transform: rotateY(180deg); }

@media (hover: hover) { 
  .card-wrapper:hover .card-inner:not(.is-flipped) { 
    transform: translate3d(0, -6px, 0) scale(1.02); 
    box-shadow: 0 15px 35px rgba(140, 161, 146, 0.2); 
  } 
}

.card-front, .card-back { 
  width: 100%; 
  backface-visibility: hidden; 
  -webkit-backface-visibility: hidden; 
  border-radius: 18px; 
}

.card-back { 
  position: absolute; 
  top: 0; 
  left: 0; 
  height: 100%; 
  transform: rotateY(180deg); 
  display: flex; 
  flex-direction: column; 
  overflow: hidden; 
  background: white;
}

/* 灵魂排版：Anti-CLS 渐进式渲染 (Blur-up 基础) */
.img-container { 
  width: 100%; 
  position: relative; 
  border-radius: 12px 12px 0 0; 
  overflow: hidden; 
  background: linear-gradient(120deg, rgba(140,161,146,0.05), rgba(140,161,146,0.15)); 
}

.img-container img { 
  position: absolute;
  top: 0;
  left: 0;
  width: 100%; 
  height: 100%; 
  display: block; 
  object-fit: cover;
  transition: opacity 0.8s ease, filter 0.6s ease; 
}

.card-content { padding: 15px; }
.photo-desc { font-size: 14px; line-height: 1.6; color: var(--text-dark, #333); margin-bottom: 10px; }
.card-meta { font-size: 12px; color: var(--text-muted, #999); display: flex; justify-content: space-between; }

/* 背面样式 */
.back-header { padding: 18px 20px; border-bottom: 1px solid rgba(0,0,0,0.03); display: flex; justify-content: center; align-items: center; font-size: 14px; font-weight: 700; color: var(--accent-color, #8CA192); letter-spacing: 4px; background: rgba(140,161,146,0.05); }
.comments-list { flex: 1; padding: 20px; overflow-y: auto; text-align: left; }
.empty-comment-tip { text-align: center; padding: 30px 20px; color: #999; font-style: italic; opacity: 0.5; animation: fadeInSmooth 1s ease forwards; }

@keyframes fadeInSmooth { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
