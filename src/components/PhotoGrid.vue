<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { createClient } from '@supabase/supabase-js';
import { appState, filteredPhotos, groupedTimelinePhotos } from '../store/state.js';
import { SUPABASE_CONFIG, vibrate } from '../utils/core.js';
import PhotoCard from './PhotoCard.vue';

// --- 1. 初始化 Supabase (移出 setup 外部或顶部以防止重复实例化警告) ---
const supabase = createClient(SUPABASE_CONFIG.Url, SUPABASE_CONFIG.Key);

// --- 2. 路径与音乐引擎 (纠正末尾斜杠粘连问题) ---
const getCleanBase = () => {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? base : `${base}/`;
};
const musicUrl = `${getCleanBase()}xvni.mp3`;

const toggleMusic = () => {
  vibrate(10);
  const m = document.getElementById('bgMusic');
  const btn = document.getElementById('musicBtn');
  if (!m) return;

  if (m.paused) {
    m.play().then(() => {
      btn.classList.add('playing');
    }).catch(() => {
      alert('岁月静好，需轻触页面以唤醒回音。');
    });
  } else {
    m.pause();
    btn.classList.remove('playing');
  }
};

// --- 3. 响应式布局与瀑布流逻辑 ---
const colCount = ref(3);
const updateColCount = () => {
  if (typeof window !== 'undefined') {
    if (window.innerWidth <= 600) colCount.value = 1;
    else if (window.innerWidth <= 900) colCount.value = 2;
    else colCount.value = 3;
  }
};

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
    colHeights[minColIdx] += (100 / ratio) + 35;
  });
  return cols;
});

const getPairs = (list) => {
  const readyList = list.filter(p => photoRatios.value.has(p.id));
  const pairs = [];
  for (let i = 0; i < readyList.length; i += 2) pairs.push([readyList[i], readyList[i + 1]]);
  return pairs;
};

// --- 4. 监听与加载 ---
watch(filteredPhotos, async (newPhotos) => {
  if (newPhotos.length === 0) return;
  const unknownPhotos = newPhotos.filter(p => !photoRatios.value.has(p.id));
  if (unknownPhotos.length > 0) await enrichPhotosWithRatios(unknownPhotos);
}, { immediate: true });

onMounted(async () => {
  updateColCount();
  window.addEventListener('resize', updateColCount);
  try {
    const { data, error } = await supabase.from('photos').select('*').order('created_at', { ascending: false });
    if (!error && data) appState.photos = data;
  } catch (err) { console.error("Supabase 数据加载失败:", err); }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('resize', updateColCount);
});
</script>

<template>
  <main id="main-container">
    <div class="search-section">
      <input 
        type="text" 
        id="memory-search"
        name="memory-search"
        v-model="appState.searchQuery" 
        placeholder="在岁月中检索..." 
        autocomplete="off"
      />
    </div>

    <audio id="bgMusic" loop preload="auto">
      <source :src="musicUrl" type="audio/mpeg">
    </audio>
    <div id="musicBtn" class="music-disk" @click="toggleMusic"></div>

    <div v-if="filteredPhotos.length > 0 && readyPhotos.length === 0" class="loading-state">
      <div class="pulse-loader"></div>
      <span>正在打捞记忆碎片...</span>
    </div>

    <div v-else-if="filteredPhotos.length === 0" class="empty-state">
      🍂 这里的记忆还未被拾起...
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
            <PhotoCard :key="'left-' + pair[0].id" :photo="pair[0]" :aspectRatio="photoRatios.get(pair[0].id)" />
          </div>
          <div class="tl-right" v-if="pair[1]">
            <PhotoCard :key="'right-' + pair[1].id" :photo="pair[1]" :aspectRatio="photoRatios.get(pair[1].id)" />
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
#main-container { position: relative; z-index: 10; max-width: 1280px; margin: 0 auto; padding: 20px 40px 100px; }
.search-section { margin-bottom: 40px; text-align: center; }
.search-section input {
  background: var(--glass-bg); border: 1px solid var(--accent-color);
  padding: 12px 25px; border-radius: 30px; width: 300px; color: var(--text-color);
  outline: none; transition: all 0.3s ease; backdrop-filter: blur(5px);
}
.search-section input:focus { width: 350px; box-shadow: 0 0 15px rgba(140, 161, 146, 0.3); }

/* 瀑布流 & 音乐磁盘 样式保持不变... */
.true-waterfall { display: flex; align-items: flex-start; gap: 30px; }
.waterfall-col { flex: 1; display: flex; flex-direction: column; }
.col-inner { display: flex; flex-direction: column; gap: 35px; }
.music-disk { 
  position: fixed; bottom: 30px; right: 30px; z-index: 1000; width: 52px; height: 52px; 
  border-radius: 50%; cursor: pointer; background: conic-gradient(#111, #333, #111, #333, #111);
  border: 3px solid rgba(255,255,255,0.9); animation: diskSpin 5s linear infinite; animation-play-state: paused;
}
.music-disk.playing { animation-play-state: running; }
@keyframes diskSpin { to { transform: rotate(360deg); } }
/* 时光轴等其他样式建议沿用你之前的 CSS */
</style>
