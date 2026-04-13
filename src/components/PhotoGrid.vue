<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { createClient } from '@supabase/supabase-js';
import { appState, filteredPhotos, groupedTimelinePhotos } from '../store/state.js';
import { SUPABASE_CONFIG } from '../utils/core.js';
import PhotoCard from './PhotoCard.vue';

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

// 最短列优先算法 (保留，为了布局平齐)
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
    colHeights[minColIdx] += (100 / ratio) + 30; 
  });

  return cols;
});

const getPairs = (list) => {
  const readyList = list.filter(p => photoRatios.value.has(p.id));
  const pairs = [];
  for (let i = 0; i < readyList.length; i += 2) pairs.push([readyList[i], readyList[i + 1]]);
  return pairs;
};

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
.true-waterfall { display: flex; align-items: flex-start; gap: 30px; width: 100%; }
.waterfall-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.col-inner { display: flex; flex-direction: column; gap: 35px; width: 100%; }

.view-timeline { display: flex; flex-direction: column; max-width: 900px; margin: 0 auto; position: relative; }
.view-timeline::before { content: ''; position: absolute; width: 2px; background: linear-gradient(to bottom, transparent, var(--accent-color), transparent); opacity: 0.3; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); z-index: 0; }
.time-badge { align-self: center; background: var(--glass-bg, rgba(255,255,255,0.9)); padding: 8px 28px; border-radius: 50px; font-size: 14px; font-weight: 600; margin: 40px auto 20px; z-index: 2; border: 1px solid var(--accent-color); box-shadow: var(--shadow-soft); backdrop-filter: blur(10px); width: max-content; display: block; position: relative; }
.tl-row { display: flex; width: 100%; position: relative; z-index: 1; }
.tl-left, .tl-right { width: 50%; padding: 15px 40px; position: relative; }
.tl-right { margin-left: auto; }
.tl-row::after { content: ''; position: absolute; width: 12px; height: 12px; background: white; border: 3px solid var(--accent-color); border-radius: 50%; top: 45px; left: 50%; transform: translateX(-50%); z-index: 3; box-shadow: 0 0 15px rgba(140, 161, 146, 0.4); }

.empty-state, .loading-state { text-align: center; padding: 80px 20px; color: var(--text-muted); font-size: 14px; letter-spacing: 1px; animation: fadeInSmooth 0.8s ease; display: flex; flex-direction: column; align-items: center; gap: 15px; }
.pulse-loader { width: 16px; height: 16px; border-radius: 50%; background: var(--accent-color); animation: pulseBeat 1s infinite alternate; }
@keyframes pulseBeat { from { transform: scale(0.8); opacity: 0.5; box-shadow: 0 0 0 rgba(140, 161, 146, 0.4); } to { transform: scale(1.2); opacity: 1; box-shadow: 0 0 15px rgba(140, 161, 146, 0.6); } }

@media (max-width: 900px) { .true-waterfall { gap: 20px; } }
@media (max-width: 600px) { 
  #main-container { padding: 10px 16px 80px 16px; } 
  .col-inner { gap: 25px; }
  .view-timeline::before { left: 24px; }
  .tl-row { flex-direction: column; }
  .tl-left, .tl-right { width: 100%; padding: 15px 0 15px 40px; }
  .tl-row::after { left: 24px; top: 40px; width: 10px; height: 10px; }
  .time-badge { margin-left: 24px; margin-right: auto; }
}
</style>