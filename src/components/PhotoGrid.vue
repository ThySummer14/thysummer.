<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { createClient } from '@supabase/supabase-js';
import { appState, filteredPhotos, groupedTimelinePhotos } from '../store/state.js';
import { SUPABASE_CONFIG, vibrate } from '../utils/core.js';
import PhotoCard from './PhotoCard.vue';

// --- 1. Supabase 单例（解决警告） ---
let supabase = null;
const getSupabase = () => {
  if (!supabase) {
    supabase = createClient(SUPABASE_CONFIG.Url, SUPABASE_CONFIG.Key);
  }
  return supabase;
};

// --- 2. 音乐路径终极方案 ---
// 针对你的仓库名带点的情况，手动构建绝对安全的 URL
const musicUrl = computed(() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  // 强制修正：确保路径是 /thysummer./xvni.mp3
  return `${origin}/thysummer./xvni.mp3`;
});

const toggleMusic = () => {
  vibrate(10);
  const m = document.getElementById('bgMusic');
  const btn = document.getElementById('musicBtn');
  if (!m) return;
  if (m.paused) {
    m.play().then(() => btn.classList.add('playing')).catch(() => alert('请轻触页面唤醒旋律'));
  } else {
    m.pause();
    btn.classList.remove('playing');
  }
};

// --- 3. 瀑布流逻辑 (保持不变) ---
const colCount = ref(3);
const photoRatios = ref(new Map());
const updateColCount = () => {
  if (window.innerWidth <= 600) colCount.value = 1;
  else if (window.innerWidth <= 900) colCount.value = 2;
  else colCount.value = 3;
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
  for (const photo of photos) {
    if (!photoRatios.value.has(photo.id)) {
      const ratio = await sniffImageRatio(photo);
      photoRatios.value.set(photo.id, ratio);
    }
  }
};

const readyPhotos = computed(() => filteredPhotos.value.filter(p => photoRatios.value.has(p.id)));

const waterfallColumns = computed(() => {
  const cols = Array.from({ length: colCount.value }, () => []);
  const colHeights = new Array(colCount.value).fill(0);
  readyPhotos.value.forEach(photo => {
    const minColIdx = colHeights.indexOf(Math.min(...colHeights));
    cols[minColIdx].push(photo);
    colHeights[minColIdx] += (100 / (photoRatios.value.get(photo.id) || 1)) + 35;
  });
  return cols;
});

// --- 4. 生命周期 ---
onMounted(async () => {
  updateColCount();
  window.addEventListener('resize', updateColCount);
  const client = getSupabase();
  const { data, error } = await client.from('photos').select('*').order('created_at', { ascending: false });
  if (!error && data) appState.photos = data;
});
</script>

<template>
  <main id="main-container">
    <div class="search-wrapper" v-if="!appState.hasGlobalSearch">
      <input 
        id="memory-search" 
        name="memory-search"
        type="text" 
        v-model="appState.searchQuery" 
        placeholder="在岁月中检索..." 
        autocomplete="off"
      />
    </div>

    <audio id="bgMusic" loop preload="auto">
      <source :src="musicUrl" type="audio/mpeg">
    </audio>
    <div id="musicBtn" class="music-disk" @click="toggleMusic"></div>

    <div v-if="appState.photos.length > 0 && readyPhotos.length === 0" class="loading-hint">正在打捞记忆...</div>

    <div v-else class="true-waterfall">
      <div v-for="(col, idx) in waterfallColumns" :key="idx" class="waterfall-col">
        <PhotoCard v-for="photo in col" :key="photo.id" :photo="photo" :aspectRatio="photoRatios.get(photo.id)" />
      </div>
    </div>
  </main>
</template>

<style scoped>
/* 样式保持原样 */
.search-wrapper { margin-bottom: 30px; text-align: center; }
#memory-search { padding: 10px 20px; border-radius: 20px; border: 1px solid var(--accent-color); background: var(--glass-bg); width: 260px; outline: none; }
.music-disk { position: fixed; bottom: 30px; right: 30px; width: 50px; height: 50px; background: #222; border-radius: 50%; border: 2px solid #fff; cursor: pointer; z-index: 100; animation: spin 5s linear infinite paused; }
.music-disk.playing { animation-play-state: running; }
@keyframes spin { to { transform: rotate(360deg); } }
.true-waterfall { display: flex; gap: 20px; }
.waterfall-col { flex: 1; display: flex; flex-direction: column; gap: 20px; }
</style>
