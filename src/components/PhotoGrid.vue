<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { createClient } from '@supabase/supabase-js';
import { appState, filteredPhotos, groupedTimelinePhotos } from '../store/state.js';
import { SUPABASE_CONFIG, vibrate } from '../utils/core.js';
import PhotoCard from './PhotoCard.vue';

const getSupabase = () => {
  if (typeof window === 'undefined') return createClient(SUPABASE_CONFIG.Url, SUPABASE_CONFIG.Key);
  if (!window.__supabaseClient) {
    window.__supabaseClient = createClient(SUPABASE_CONFIG.Url, SUPABASE_CONFIG.Key);
  }
  return window.__supabaseClient;
};

const musicUrl = import.meta.env.PROD ? '/thysummer./xvni.mp3' : '/xvni.mp3';

const toggleMusic = () => {
  vibrate(12); // 更饱满的音乐按钮震感
  const m = document.getElementById('bgMusic');
  const btn = document.getElementById('musicBtn');
  if (!m) return;

  if (m.paused) {
    m.play().then(() => {
      btn.classList.add('playing');
      btn.classList.remove('error-state');
    }).catch((err) => {
      console.warn('🎶 回音无法唤醒，可能受到浏览器限制或网络波动', err);
      btn.classList.remove('playing');
      btn.classList.add('error-state');
    });
  } else {
    m.pause();
    btn.classList.remove('playing');
  }
};

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

watch(filteredPhotos, async (newPhotos) => {
  if (newPhotos.length === 0) return;
  const unknownPhotos = newPhotos.filter(p => !photoRatios.value.has(p.id));
  if (unknownPhotos.length > 0) await enrichPhotosWithRatios(unknownPhotos);
}, { immediate: true });

onMounted(async () => {
  updateColCount();
  window.addEventListener('resize', updateColCount);
  try {
    const supabase = getSupabase(); 
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

    <div v-else-if="appState.currentMode === 'gallery'" class="true-waterfall hardware-accelerated">
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

    <div v-else class="view-timeline hardware-accelerated">
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

.hardware-accelerated { transform: translateZ(0); will-change: transform; }

.true-waterfall { display: flex; align-items: flex-start; gap: 30px; }
.waterfall-col { flex: 1; display: flex; flex-direction: column; }
.col-inner { display: flex; flex-direction: column; gap: 35px; }

.music-disk { 
  position: fixed; bottom: 30px; right: 30px; z-index: 1000; width: 52px; height: 52px; 
  border-radius: 50%; cursor: pointer; background: conic-gradient(#111, #333, #111, #333, #111);
  border: 3px solid rgba(255,255,255,0.9); animation: diskSpin 5s linear infinite; animation-play-state: paused;
  transition: border-color 0.3s, transform 0.2s;
  /* ✨ 消除点击延迟，找回失传已久的物理触感 */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.music-disk:active { transform: scale(0.95); }
.music-disk.playing { animation-play-state: running; box-shadow: 0 0 20px rgba(140, 161, 146, 0.4); }
.music-disk.error-state { border-color: #e74c3c; animation: pulseError 1s infinite alternate; animation-play-state: running; }

@keyframes diskSpin { to { transform: rotate(360deg); } }
@keyframes pulseError { from { box-shadow: 0 0 5px rgba(231,76,60,0.3); } to { box-shadow: 0 0 20px rgba(231,76,60,0.8); } }

.empty-state, .loading-state { text-align: center; padding: 80px 20px; color: var(--text-muted); font-size: 14px; display: flex; flex-direction: column; align-items: center; gap: 15px; }
.pulse-loader { width: 16px; height: 16px; border-radius: 50%; background: var(--accent-color); animation: pulseBeat 1s infinite alternate; }
@keyframes pulseBeat { from { transform: scale(0.8); opacity: 0.5; } to { transform: scale(1.2); opacity: 1; } }

.view-timeline { display: flex; flex-direction: column; max-width: 900px; margin: 0 auto; position: relative; }
.view-timeline::before { content: ''; position: absolute; width: 2px; background: linear-gradient(to bottom, transparent, var(--accent-color), transparent); opacity: 0.3; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); z-index: 0; }
.time-badge { align-self: center; background: var(--glass-bg, rgba(255,255,255,0.9)); padding: 8px 28px; border-radius: 50px; font-size: 14px; font-weight: 600; margin: 40px auto 20px; z-index: 2; border: 1px solid var(--accent-color); backdrop-filter: blur(10px); width: max-content; }
.tl-row { display: flex; width: 100%; position: relative; z-index: 1; }
.tl-left, .tl-right { width: 50%; padding: 15px 40px; position: relative; }
.tl-row::after { content: ''; position: absolute; width: 12px; height: 12px; background: white; border: 3px solid var(--accent-color); border-radius: 50%; top: 45px; left: 50%; transform: translateX(-50%); z-index: 3; box-shadow: 0 0 15px rgba(140,161,146,0.4); }

/* ✨ 彻底重写手机端“岁月模式”：坚决使用一列，释放图片空间 */
@media (max-width: 768px) {
  .tl-row { flex-direction: column !important; }
  .tl-left, .tl-right { width: 100% !important; padding: 15px 20px 15px 40px !important; }
}
</style>
