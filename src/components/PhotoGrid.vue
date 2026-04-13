<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { createClient } from '@supabase/supabase-js';
import { appState, filteredPhotos, groupedTimelinePhotos } from '../store/state.js';
import { SUPABASE_CONFIG, vibrate } from '../utils/core.js';
import PhotoCard from './PhotoCard.vue';

// =========================================
// 1. Supabase 单例 (彻底消灭多实例警告)
// =========================================
let supabase = null;
const getSupabase = () => {
  if (!supabase) supabase = createClient(SUPABASE_CONFIG.Url, SUPABASE_CONFIG.Key);
  return supabase;
};

// =========================================
// 2. 音乐引擎 (Vite 现代路径解析 + 静默降级)
// =========================================
// ✨ 核心修复：彻底抛弃硬编码，使用 import.meta.url 让 Vite 自动追踪绝对安全的 public 路径
const musicUrl = new URL('/xvni.mp3', import.meta.url).href;

const toggleMusic = () => {
  vibrate(10);
  const m = document.getElementById('bgMusic');
  const btn = document.getElementById('musicBtn');
  if (!m) return;
  
  if (m.paused) {
    m.play().then(() => {
      btn.classList.add('playing');
      btn.classList.remove('error-state');
    }).catch((err) => {
      console.warn('🎶 回音无法唤醒，可能受到浏览器限制或网络波动', err);
      // 优雅降级：不弹 alert 骚扰用户，而是让唱片按钮显示故障红光
      btn.classList.remove('playing');
      btn.classList.add('error-state');
    });
  } else {
    m.pause();
    btn.classList.remove('playing');
  }
};

// =========================================
// 3. 高性能瀑布流算法
// =========================================
const colCount = ref(3);
const photoRatios = ref(new Map());

const updateColCount = () => {
  if (typeof window !== 'undefined') {
    if (window.innerWidth <= 600) colCount.value = 1;
    else if (window.innerWidth <= 900) colCount.value = 2;
    else colCount.value = 3;
  }
};

const sniffImageRatio = (photo) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
    img.onerror = () => resolve(0.75); 
    img.src = photo.image_url;
  });
};

const enrichPhotosWithRatios = async (photos) => {
  await Promise.all(photos.map(async (photo) => {
    if (!photoRatios.value.has(photo.id)) {
      const ratio = await sniffImageRatio(photo);
      photoRatios.value.set(photo.id, ratio);
    }
  }));
};

const readyPhotos = computed(() => filteredPhotos.value.filter(p => photoRatios.value.has(p.id)));

const waterfallColumns = computed(() => {
  const cols = Array.from({ length: colCount.value }, () => []);
  const colHeights = new Array(colCount.value).fill(0);
  
  readyPhotos.value.forEach(photo => {
    let minColIdx = 0;
    let minHeight = colHeights[0];
    for (let i = 1; i < colCount.value; i++) {
      if (colHeights[i] < minHeight) {
        minHeight = colHeights[i];
        minColIdx = i;
      }
    }
    cols[minColIdx].push(photo);
    colHeights[minColIdx] += (100 / (photoRatios.value.get(photo.id) || 1)) + 35;
  });
  return cols;
});

const getPairs = (list) => {
  const rList = list.filter(p => photoRatios.value.has(p.id));
  const pairs = [];
  for (let i = 0; i < rList.length; i += 2) pairs.push([rList[i], rList[i + 1]]);
  return pairs;
};

// =========================================
// 4. 生命周期
// =========================================
watch(filteredPhotos, async (newPhotos) => {
  const unknown = newPhotos.filter(p => !photoRatios.value.has(p.id));
  if (unknown.length > 0) await enrichPhotosWithRatios(unknown);
}, { immediate: true });

onMounted(async () => {
  updateColCount();
  window.addEventListener('resize', updateColCount);
  try {
    const client = getSupabase();
    const { data, error } = await client.from('photos').select('*').order('created_at', { ascending: false });
    if (!error && data) appState.photos = data;
  } catch (err) { console.error("数据拉取异常:", err); }
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
    <div id="musicBtn" class="music-disk" @click="toggleMusic" title="拾光回音"></div>

    <div v-if="appState.photos.length > 0 && readyPhotos.length === 0" class="loading-state">
      <div class="pulse-loader"></div>
      <span>正在为记忆丈量身姿...</span>
    </div>

    <div v-else-if="filteredPhotos.length === 0" class="empty-state">
      拨开岁月的尘埃...未发现相关碎片。
    </div>

    <div v-else-if="appState.currentMode === 'gallery'" class="true-waterfall hardware-accelerated">
      <div v-for="(col, cIndex) in waterfallColumns" :key="cIndex" class="waterfall-col">
        <PhotoCard 
          v-for="photo in col" 
          :key="photo.id" 
          :photo="photo" 
          :aspectRatio="photoRatios.get(photo.id)" 
        />
      </div>
    </div>

    <div v-else class="view-timeline hardware-accelerated">
      <div v-for="(list, month) in groupedTimelinePhotos" :key="month">
        <div class="time-badge" v-if="getPairs(list).length > 0">{{ month }}</div>
        <div class="tl-row" v-for="(pair, idx) in getPairs(list)" :key="idx">
          <div class="tl-left">
            <PhotoCard v-if="pair[0]" :photo="pair[0]" :aspectRatio="photoRatios.get(pair[0].id)" />
          </div>
          <div class="tl-right">
            <PhotoCard v-if="pair[1]" :photo="pair[1]" :aspectRatio="photoRatios.get(pair[1].id)" />
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
#main-container { position: relative; max-width: 1280px; margin: 0 auto; padding: 20px 40px 100px; -webkit-font-smoothing: antialiased; }
.hardware-accelerated { transform: translateZ(0); will-change: transform; }
.true-waterfall { display: flex; align-items: flex-start; gap: 30px; }
.waterfall-col { flex: 1; display: flex; flex-direction: column; gap: 35px; min-width: 0; }

.view-timeline { display: flex; flex-direction: column; max-width: 900px; margin: 0 auto; position: relative; }
.view-timeline::before { content: ''; position: absolute; width: 2px; background: linear-gradient(to bottom, transparent, var(--accent-color), transparent); opacity: 0.3; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); z-index: 0; }
.time-badge { align-self: center; background: var(--glass-bg, rgba(255,255,255,0.9)); padding: 8px 28px; border-radius: 50px; font-size: 14px; font-weight: 600; margin: 40px auto 20px; z-index: 2; border: 1px solid var(--accent-color); backdrop-filter: blur(10px); width: max-content; }
.tl-row { display: flex; width: 100%; position: relative; z-index: 1; }
.tl-left, .tl-right { width: 50%; padding: 15px 40px; position: relative; }
.tl-row::after { content: ''; position: absolute; width: 12px; height: 12px; background: white; border: 3px solid var(--accent-color); border-radius: 50%; top: 45px; left: 50%; transform: translateX(-50%); z-index: 3; box-shadow: 0 0 15px rgba(140,161,146,0.4); }

.empty-state, .loading-state { text-align: center; padding: 80px 20px; color: var(--text-muted); font-size: 15px; letter-spacing: 1px; animation: fadeInSmooth 0.8s ease backwards; }
@keyframes fadeInSmooth { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.pulse-loader { width: 16px; height: 16px; border-radius: 50%; background: var(--accent-color); animation: pulseBeat 1s infinite alternate; margin: 0 auto 15px; }
@keyframes pulseBeat { from { transform: scale(0.8); opacity: 0.5; } to { transform: scale(1.2); opacity: 1; } }

/* 音乐控件与错误警告灯 */
.music-disk { position: fixed; bottom: 30px; right: 30px; z-index: 1000; width: 52px; height: 52px; border-radius: 50%; cursor: pointer; box-shadow: 0 10px 30px rgba(0,0,0,0.2); background: conic-gradient(#111, #333, #111, #333, #111); border: 3px solid rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center; animation: diskSpin 5s linear infinite; animation-play-state: paused; transition: border-color 0.3s; }
.music-disk::before { content: ''; position: absolute; width: 14px; height: 14px; background: var(--accent-color); border-radius: 50%; border: 2px solid #fff; z-index: 2; transition: background 0.3s; }
.music-disk.playing { animation-play-state: running; box-shadow: 0 0 20px rgba(140, 161, 146, 0.4); }
.music-disk.error-state { border-color: #e74c3c; animation: pulseError 1s infinite alternate; animation-play-state: running; }
.music-disk.error-state::before { background: #e74c3c; }

@keyframes diskSpin { to { transform: rotate(360deg); } }
@keyframes pulseError { from { box-shadow: 0 0 5px rgba(231,76,60,0.3); } to { box-shadow: 0 0 20px rgba(231,76,60,0.8); } }

@media (max-width: 900px) { .true-waterfall { gap: 20px; } }
@media (max-width: 600px) {
  #main-container { padding: 10px 0 80px 0; }
  .view-timeline::before { left: 24px; }
  .tl-row { flex-direction: column; }
  .tl-left, .tl-right { width: 100%; padding: 15px 16px 15px 50px; }
  .tl-row::after { left: 24px; top: 40px; width: 10px; height: 10px; }
  .time-badge { margin-left: 24px; align-self: flex-start; }
}
</style>
