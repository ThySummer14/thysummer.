<script setup>
/**
 * @file src/components/PhotoGrid.vue
 * @description 拾光集核心引擎 - 包含：最短列瀑布流、搜索动效、动态路径音乐控制
 */
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { createClient } from '@supabase/supabase-js';
import { appState, filteredPhotos, groupedTimelinePhotos } from '../store/state.js';
import { SUPABASE_CONFIG, vibrate } from '../utils/core.js';
import PhotoCard from './PhotoCard.vue';

// --- 1. 路径与音乐引擎 ---
// ✨ 核心修复：动态获取 base 路径，确保在 GitHub Pages 二级目录下音乐不失踪
const musicUrl = `${import.meta.env.BASE_URL}xvni.mp3`;

const toggleMusic = () => {
  vibrate(10);
  const m = document.getElementById('bgMusic');
  const btn = document.getElementById('musicBtn');
  if (!m) return;

  if (m.paused) {
    m.play().then(() => {
      btn.classList.add('playing');
    }).catch(() => {
      // 处理浏览器自动播放拦截
      alert('岁月静好，需轻触页面以唤醒回音。');
    });
  } else {
    m.pause();
    btn.classList.remove('playing');
  }
};

// --- 2. 响应式布局逻辑 ---
const colCount = ref(3);
const updateColCount = () => {
  if (typeof window !== 'undefined') {
    if (window.innerWidth <= 600) colCount.value = 1;
    else if (window.innerWidth <= 900) colCount.value = 2;
    else colCount.value = 3;
  }
};

// --- 3. 图像尺寸嗅探与瀑布流算法 ---
const photoRatios = ref(new Map());

const sniffImageRatio = (photo) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
    img.onerror = () => resolve(3 / 4); 
    img.src = photo.image_url;
  });
};

const enrichPhotosWithRatios = async (photos) => {
  const promises = photos.map(async (photo) => {
    if (photoRatios.value.has(photo.id)) return; 
    const ratio = await sniffImageRatio(photo);
    photoRatios.value.set(photo.id, ratio);
  });
  await Promise.all(promises);
};

const readyPhotos = computed(() => {
  return filteredPhotos.value.filter(p => photoRatios.value.has(p.id));
});

// 最短列优先算法 (Shortest Column First)
const waterfallColumns = computed(() => {
  const cols = Array.from({ length: colCount.value }, () => []);
  const colHeights = new Array(colCount.value).fill(0);

  readyPhotos.value.forEach((photo) => {
    let minColIdx = 0;
    let minHeight = colHeights[0];
    for (let i = 1; i < colCount.value; i++) {
      if (colHeights[i] < minHeight) {
        minHeight = colHeights[i];
        minColIdx = i;
      }
    }
    cols[minColIdx].push(photo);
    const ratio = photoRatios.value.get(photo.id) || 1;
    colHeights[minColIdx] += (100 / ratio) + 35; // 35 是文本信息的高度权重
  });
  return cols;
});

const getPairs = (list) => {
  const readyList = list.filter(p => photoRatios.value.has(p.id));
  const pairs = [];
  for (let i = 0; i < readyList.length; i += 2) pairs.push([readyList[i], readyList[i + 1]]);
  return pairs;
};

// --- 4. 生命周期与监听 ---
watch(filteredPhotos, async (newPhotos) => {
  if (newPhotos.length === 0) return;
  const unknownPhotos = newPhotos.filter(p => !photoRatios.value.has(p.id));
  if (unknownPhotos.length > 0) await enrichPhotosWithRatios(unknownPhotos);
}, { immediate: true });

onMounted(async () => {
  updateColCount();
  window.addEventListener('resize', updateColCount);
  try {
    const supabase = createClient(SUPABASE_CONFIG.Url, SUPABASE_CONFIG.Key);
    const { data, error } = await supabase.from('photos').select('*').order('created_at', { ascending: false });
    if (!error && data) appState.photos = data;
  } catch (err) { console.error("Supabase Error:", err); }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('resize', updateColCount);
});
</script>

<template>
  <main id="main-container">
    <audio id="bgMusic" loop preload="auto">
      <source :src="musicUrl" type="audio/mpeg">
    </audio>
    <div id="musicBtn" class="music-disk" @click="toggleMusic" title="轻触播放音乐"></div>

    <div v-if="filteredPhotos.length > 0 && readyPhotos.length === 0" class="loading-state">
      <div class="pulse-loader"></div>
      <span>正在为记忆丈量身姿...</span>
    </div>

    <div v-else-if="filteredPhotos.length === 0" class="empty-state">
      🍂 未能在岁月的长河里打捞到此碎片...
    </div>

    <div v-else-if="appState.currentMode === 'gallery'" class="true-waterfall">
      <div v-for="(col, cIndex) in waterfallColumns" :key="cIndex" class="waterfall-col">
        <div class="col-inner">
          <PhotoCard 
            v-for="photo in col" 
            :key="photo.id + '-' + appState.searchQuery" 
            :photo="photo" 
            :aspectRatio="photoRatios.get(photo.id)" 
          />
        </div>
      </div>
    </div>

    <div v-else class="view-timeline">
      <div v-for="(list, month) in groupedTimelinePhotos" :key="month">
        <div class="time-badge" v-if="getPairs(list).length > 0">{{ month }}</div>
        <div class="tl-row" v-for="(pair, idx) in getPairs(list)" :key="idx">
          <div class="tl-left">
            <PhotoCard :key="'left-' + pair[0].id + '-' + appState.searchQuery" :photo="pair[0]" :aspectRatio="photoRatios.get(pair[0].id)" />
          </div>
          <div class="tl-right" v-if="pair[1]">
            <PhotoCard :key="'right-' + pair[1].id + '-' + appState.searchQuery" :photo="pair[1]" :aspectRatio="photoRatios.get(pair[1].id)" />
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
#main-container { position: relative; z-index: 10; max-width: 1280px; margin: 0 auto; padding: 20px 40px 100px; -webkit-font-smoothing: antialiased; }

/* 瀑布流容器 */
.true-waterfall { display: flex; align-items: flex-start; gap: 30px; width: 100%; }
.waterfall-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.col-inner { display: flex; flex-direction: column; gap: 35px; position: relative; width: 100%; }

/* 时光轴样式 */
.view-timeline { display: flex; flex-direction: column; max-width: 900px; margin: 0 auto; position: relative; }
.view-timeline::before { content: ''; position: absolute; width: 2px; background: linear-gradient(to bottom, transparent, var(--accent-color), transparent); opacity: 0.3; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); z-index: 0; }
.time-badge { align-self: center; background: var(--glass-bg, rgba(255,255,255,0.9)); padding: 8px 28px; border-radius: 50px; font-size: 14px; font-weight: 600; margin: 40px auto 20px; z-index: 2; border: 1px solid var(--accent-color); box-shadow: var(--shadow-soft); backdrop-filter: blur(10px); width: max-content; display: block; position: relative; }
.tl-row { display: flex; width: 100%; position: relative; z-index: 1; }
.tl-left, .tl-right { width: 50%; padding: 15px 40px; position: relative; }
.tl-row::after { content: ''; position: absolute; width: 12px; height: 12px; background: white; border: 3px solid var(--accent-color); border-radius: 50%; top: 45px; left: 50%; transform: translateX(-50%); z-index: 3; box-shadow: 0 0 15px rgba(140, 161, 146, 0.4); }

/* 状态提示 */
.empty-state, .loading-state { text-align: center; padding: 80px 20px; color: var(--text-muted); font-size: 14px; display: flex; flex-direction: column; align-items: center; gap: 15px; }
.pulse-loader { width: 16px; height: 16px; border-radius: 50%; background: var(--accent-color); animation: pulseBeat 1s infinite alternate; }
@keyframes pulseBeat { from { transform: scale(0.8); opacity: 0.5; } to { transform: scale(1.2); opacity: 1; } }

/* 🎵 物理黑胶唱片样式 */
.music-disk { 
  position: fixed; bottom: 30px; right: 30px; z-index: 1000; width: 52px; height: 52px; 
  border-radius: 50%; cursor: pointer; box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
  background: conic-gradient(#111, #333, #111, #333, #111); border: 3px solid rgba(255,255,255,0.9);
  display: flex; align-items: center; justify-content: center;
  animation: diskSpin 5s linear infinite; animation-play-state: paused;
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); 
}
.music-disk::before { content: ''; position: absolute; width: 14px; height: 14px; background: var(--accent-color); border-radius: 50%; border: 2px solid #fff; z-index: 2; }
.music-disk.playing { animation-play-state: running; filter: drop-shadow(0 0 10px rgba(140,161,146,0.5)); }
.music-disk:active { transform: scale(0.9); }
@keyframes diskSpin { to { transform: rotate(360deg); } }

@media (max-width: 900px) { .true-waterfall { gap: 20px; } }
@media (max-width: 600px) { 
  #main-container { padding: 10px 16px 80px 16px; } 
  .view-timeline::before { left: 24px; }
  .tl-row { flex-direction: column; }
  .tl-left, .tl-right { width: 100%; padding: 15px 0 15px 40px; }
  .tl-row::after { left: 24px; top: 40px; }
  .time-badge { margin-left: 24px; margin-right: auto; }
}
</style>
