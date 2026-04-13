<script setup>
import { appState } from '../store/state.js';
import { vibrate } from '../utils/core.js';

let searchTimer = null;
const handleSearch = (e) => {
  const value = e.target.value;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { appState.searchQuery = value.trim(); }, 300);
};

const toggleMode = () => { vibrate(15); appState.currentMode = appState.currentMode === 'gallery' ? 'timeline' : 'gallery'; };
const openUpload = () => { vibrate(10); appState.isUploading = true; };
const exportData = () => {
  vibrate([20, 30, 20]);
  try {
    const dataStr = JSON.stringify(appState.photos, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `拾光集_时光档案.json`;
    link.click();
    URL.revokeObjectURL(url);
    if (window.showToast) window.showToast('记忆已安全打包', 'success');
  } catch (err) {}
};
</script>

<template>
  <header class="main-header">
    <div class="title-group">
      <h1 class="logo">拾光集</h1>
      <p class="en-poem">Time passes in silence, yet light captures its eternal echo.</p>
    </div>
    
    <div class="console-capsule">
      <div class="subtitle">岁月无声，唯有拾光。</div>
      
      <div class="search-wrapper">
        <input type="text" class="search-box" placeholder="🔍 检索记忆碎片 (标题 / 作者 / 月份)" @input="handleSearch" />
      </div>

      <div class="controls-row">
        <button class="btn-shiguang" @click="toggleMode">
          <span v-if="appState.currentMode === 'gallery'">🕰️ 岁月模式</span>
          <span v-else>🖼️ 画廊模式</span>
        </button>
        <button class="btn-shiguang primary" @click="openUpload">✨ 珍藏此刻</button>
        <button class="btn-shiguang" @click="exportData" title="导出备份">📦 备份记忆</button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.main-header { position: relative; z-index: 20; padding: 70px 20px 40px; text-align: center; }

/* ✨ 标题艺术化排版 */
.title-group { margin-bottom: 35px; }
.logo {
  font-size: 52px;
  letter-spacing: 16px;
  font-weight: 800;
  color: var(--text-dark);
  text-indent: 16px;
  margin-bottom: 12px;
  font-family: 'Noto Serif SC', serif;
  text-shadow: 0 10px 30px rgba(140, 161, 146, 0.2);
}
.en-poem {
  font-family: 'Georgia', serif;
  font-size: 14px;
  font-style: italic;
  letter-spacing: 1px;
  color: var(--accent-color);
  opacity: 0.85;
}

.console-capsule { background: var(--glass-console); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--glass-border); border-radius: 30px; max-width: 600px; margin: 0 auto; padding: 25px; box-shadow: var(--shadow-float); display: flex; flex-direction: column; gap: 20px; align-items: center; }
.subtitle { font-size: 14px; letter-spacing: 2px; color: var(--text-muted); font-style: italic; }
.search-wrapper { width: 100%; display: flex; justify-content: center; }
.search-box { width: 100%; max-width: 320px; padding: 12px 20px; border: 1px solid rgba(140, 161, 146, 0.2); border-radius: 50px; background: rgba(255, 255, 255, 0.5); font-family: inherit; font-size: 14px; color: var(--text-dark); outline: none; transition: all 0.4s var(--cubic-bounce); text-align: center; }
.search-box:focus { background: #fff; border-color: var(--accent-color); max-width: 380px; box-shadow: 0 5px 20px rgba(140, 161, 146, 0.15); }
.controls-row { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
.btn-shiguang { background: white; color: var(--text-dark); border: 1px solid rgba(140, 161, 146, 0.3); padding: 10px 20px; border-radius: 50px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.3s var(--cubic-smooth); will-change: transform; display: flex; align-items: center; gap: 6px; }
.btn-shiguang.primary { background: var(--accent-color); color: white; border-color: transparent; box-shadow: 0 8px 20px rgba(140, 161, 146, 0.2); }
.btn-shiguang:hover { transform: translate3d(0, -3px, 0); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
.btn-shiguang:active { transform: translate3d(0, 1px, 0) scale(0.97); }

/* ✨ 移动端深度适配 */
@media (max-width: 600px) {
  .main-header { padding: 40px 15px 20px; }
  .logo { font-size: 38px; letter-spacing: 12px; text-indent: 12px; }
  .en-poem { font-size: 12px; padding: 0 10px; line-height: 1.5; }
  .console-capsule { padding: 20px 15px; border-radius: 24px; }
  .btn-shiguang { padding: 8px 16px; font-size: 12px; }
}
</style>