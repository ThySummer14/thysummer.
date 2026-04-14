<script setup>
/**
 * @file src/components/Modals.vue
 * @description 全局模态框引擎 - 探针级上传与安卓触感调优
 */
import { ref, onMounted, watch } from 'vue';
import { createClient } from '@supabase/supabase-js';
import { appState } from '../store/state.js';
import { vibrate, uploadToCOS, SUPABASE_CONFIG } from '../utils/core.js';

// --- 上传信笺状态 ---
const photoFile = ref(null);
const photoTitle = ref('');
const uploaderName = ref('');
const uploadBtnText = ref('封存');
const isSubmitting = ref(false);

// --- 时光旅人状态 ---
const identityName = ref('');

onMounted(() => {
  if (typeof window !== 'undefined') {
    const savedName = localStorage.getItem('nickname') || '';
    uploaderName.value = savedName;
    identityName.value = savedName;
  }
});

watch(() => appState.isUploading, (newVal) => {
  if (newVal && typeof window !== 'undefined') {
    uploaderName.value = localStorage.getItem('nickname') || '';
  }
});

// ==========================================
// 🚀 核心：离屏图像处理引擎 (优化版)
// ==========================================
async function compressImage(file) {
  try {
    const bitmap = await window.createImageBitmap(file);
    let w = bitmap.width, h = bitmap.height;
    if (w > 1200) { h = Math.round(h * (1200 / w)); w = 1200; }

    if (window.OffscreenCanvas) {
      const oc = new window.OffscreenCanvas(w, h);
      const ctx = oc.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
      return await oc.convertToBlob({ type: 'image/webp', quality: 0.82 });
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
      return new Promise(res => canvas.toBlob(res, 'image/webp', 0.82));
    }
  } catch (e) {
    console.error("🖼️ 图片压缩失败:", e);
    return file; // 降级处理：直接返回原文件
  }
}

// ==========================================
// 🌌 核心：投递逻辑 (接入探针引擎)
// ==========================================
const submitPhoto = async () => {
  const file = photoFile.value?.files[0];
  if (!file || !photoTitle.value.trim() || !uploaderName.value.trim()) {
    if (window.showToast) window.showToast("墨水似乎不够，请填写完整", "error");
    vibrate(40); // 错误时的厚重提示震动
    return;
  }

  isSubmitting.value = true;
  // ✨ 安卓优化：投递动作开始时给予 15ms 的轻微确认反馈
  vibrate(15); 
  localStorage.setItem('nickname', uploaderName.value.trim());

  try {
    uploadBtnText.value = "压缩图谱...";
    const finalFile = await compressImage(file);

    uploadBtnText.value = "跨越星海...";
    // ✨ 调用 core.js 里的探针引擎
    // 如果这里失败，控制台会打出非常详尽的 CORS 或权限报错
    const imageUrl = await uploadToCOS(finalFile);

    uploadBtnText.value = "落笔生花...";
    // 实例化 Supabase
    const supabase = createClient(SUPABASE_CONFIG.Url, SUPABASE_CONFIG.Key);
    const { error: dbError } = await supabase.from('photos').insert([{
      title: photoTitle.value.trim(),
      author: uploaderName.value.trim(),
      image_url: imageUrl // 使用引擎返回的规范化 URL
    }]);

    if (dbError) throw dbError;

    if (window.showToast) window.showToast("信笺已封存", "success");
    
    // ✨ 安卓优化：成功后给予两次短促震动，模拟“心跳”确认
    vibrate([20, 50, 20]); 
    
    // 自动重置并关闭
    photoTitle.value = '';
    if (photoFile.value) photoFile.value.value = '';
    appState.isUploading = false;
    
    // 延迟重载页面以同步数据
    setTimeout(() => window.location.reload(), 1200);

  } catch (err) {
    console.error("❌ 投递流程意外中断:", err);
    // 只要进入这里，说明 uploadToCOS 抛出了具体的错误
    if (window.showToast) window.showToast("星空拥堵，请看控制台报错", "error");
    vibrate([50, 100, 50]); // 失败时的强力警示震动
  } finally {
    isSubmitting.value = false;
    uploadBtnText.value = "封存";
  }
};

const closeUpload = () => { 
  if(!isSubmitting.value) {
    vibrate(5); // 关闭时的极轻微反馈
    appState.isUploading = false; 
  }
};

// ==========================================
// 🧑‍🚀 时光旅人逻辑 (同步修复)
// ==========================================
const confirmIdentity = async () => {
  const name = identityName.value.trim();
  if (!name) {
    if (window.showToast) window.showToast('契约需留名哦', 'error');
    vibrate(30);
    return;
  }
  
  localStorage.setItem('nickname', name);
  vibrate([15, 30]); // 缔结契约时的双重反馈
  appState.showIdentityModal = false;

  if (appState.pendingCommentAction) {
    const { id, content } = appState.pendingCommentAction;
    try {
      const supabase = createClient(SUPABASE_CONFIG.Url, SUPABASE_CONFIG.Key);
      await supabase.from('comments').insert([{ photo_id: id, nickname: name, content }]);
      if (window.showToast) window.showToast('留印成功', 'success');
      appState.pendingCommentAction = null;
    } catch(err) {
      if (window.showToast) window.showToast('回音迷失在风中', 'error');
    }
  }
};

const closeIdentity = () => {
  vibrate(5);
  appState.showIdentityModal = false;
  appState.pendingCommentAction = null;
};
</script>

<template>
  <Transition name="modal">
    <div class="modal-mask" v-if="appState.isUploading || appState.showIdentityModal" @click.self="closeUpload">
      
      <div class="modal-box" v-if="appState.isUploading">
        <h3 class="modal-title">时光信笺</h3>
        <input type="file" ref="photoFile" accept="image/*" class="input-box file-box" :disabled="isSubmitting">
        <input type="text" v-model="photoTitle" placeholder="给这段回忆起个名字..." class="input-box" autocomplete="off" :disabled="isSubmitting">
        <input type="text" v-model="uploaderName" placeholder="你的署名" class="input-box" autocomplete="off" :disabled="isSubmitting">
        
        <div class="btn-group">
          <button class="btn-shiguang" @click="closeUpload" :disabled="isSubmitting">收起</button>
          <button class="btn-shiguang primary" @click="submitPhoto" :disabled="isSubmitting">
            {{ uploadBtnText }}
          </button>
        </div>
      </div>

      <div class="modal-box" v-if="appState.showIdentityModal">
        <h3 class="modal-title">时光旅人</h3>
        <p class="modal-desc">初次相遇，请留下你的名号。<br>让每一次回音都有迹可循。</p>
        <input type="text" v-model="identityName" placeholder="怎么称呼你？" class="input-box" autocomplete="off">
        
        <div class="btn-group">
          <button class="btn-shiguang" @click="closeIdentity">暂不</button>
          <button class="btn-shiguang primary" @click="confirmIdentity">缔结契约</button>
        </div>
      </div>

    </div>
  </Transition>
</template>

<style scoped>
/* 此处保留你原有的 CSS 样式，无需变动 */
button, input, .modal-mask {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
/* ... 你的其他样式 ... */
</style><script setup>
/**
 * @file src/components/Modals.vue
 * @description 全局模态框引擎 - 探针级上传与安卓触感调优
 */
import { ref, onMounted, watch } from 'vue';
import { createClient } from '@supabase/supabase-js';
import { appState } from '../store/state.js';
import { vibrate, uploadToCOS, SUPABASE_CONFIG } from '../utils/core.js';

// --- 上传信笺状态 ---
const photoFile = ref(null);
const photoTitle = ref('');
const uploaderName = ref('');
const uploadBtnText = ref('封存');
const isSubmitting = ref(false);

// --- 时光旅人状态 ---
const identityName = ref('');

onMounted(() => {
  if (typeof window !== 'undefined') {
    const savedName = localStorage.getItem('nickname') || '';
    uploaderName.value = savedName;
    identityName.value = savedName;
  }
});

watch(() => appState.isUploading, (newVal) => {
  if (newVal && typeof window !== 'undefined') {
    uploaderName.value = localStorage.getItem('nickname') || '';
  }
});

// ==========================================
// 🚀 核心：离屏图像处理引擎 (优化版)
// ==========================================
async function compressImage(file) {
  try {
    const bitmap = await window.createImageBitmap(file);
    let w = bitmap.width, h = bitmap.height;
    if (w > 1200) { h = Math.round(h * (1200 / w)); w = 1200; }

    if (window.OffscreenCanvas) {
      const oc = new window.OffscreenCanvas(w, h);
      const ctx = oc.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
      return await oc.convertToBlob({ type: 'image/webp', quality: 0.82 });
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
      return new Promise(res => canvas.toBlob(res, 'image/webp', 0.82));
    }
  } catch (e) {
    console.error("🖼️ 图片压缩失败:", e);
    return file; // 降级处理：直接返回原文件
  }
}

// ==========================================
// 🌌 核心：投递逻辑 (接入探针引擎)
// ==========================================
const submitPhoto = async () => {
  const file = photoFile.value?.files[0];
  if (!file || !photoTitle.value.trim() || !uploaderName.value.trim()) {
    if (window.showToast) window.showToast("墨水似乎不够，请填写完整", "error");
    vibrate(40); // 错误时的厚重提示震动
    return;
  }

  isSubmitting.value = true;
  // ✨ 安卓优化：投递动作开始时给予 15ms 的轻微确认反馈
  vibrate(15); 
  localStorage.setItem('nickname', uploaderName.value.trim());

  try {
    uploadBtnText.value = "压缩图谱...";
    const finalFile = await compressImage(file);

    uploadBtnText.value = "跨越星海...";
    // ✨ 调用 core.js 里的探针引擎
    // 如果这里失败，控制台会打出非常详尽的 CORS 或权限报错
    const imageUrl = await uploadToCOS(finalFile);

    uploadBtnText.value = "落笔生花...";
    // 实例化 Supabase
    const supabase = createClient(SUPABASE_CONFIG.Url, SUPABASE_CONFIG.Key);
    const { error: dbError } = await supabase.from('photos').insert([{
      title: photoTitle.value.trim(),
      author: uploaderName.value.trim(),
      image_url: imageUrl // 使用引擎返回的规范化 URL
    }]);

    if (dbError) throw dbError;

    if (window.showToast) window.showToast("信笺已封存", "success");
    
    // ✨ 安卓优化：成功后给予两次短促震动，模拟“心跳”确认
    vibrate([20, 50, 20]); 
    
    // 自动重置并关闭
    photoTitle.value = '';
    if (photoFile.value) photoFile.value.value = '';
    appState.isUploading = false;
    
    // 延迟重载页面以同步数据
    setTimeout(() => window.location.reload(), 1200);

  } catch (err) {
    console.error("❌ 投递流程意外中断:", err);
    // 只要进入这里，说明 uploadToCOS 抛出了具体的错误
    if (window.showToast) window.showToast("星空拥堵，请看控制台报错", "error");
    vibrate([50, 100, 50]); // 失败时的强力警示震动
  } finally {
    isSubmitting.value = false;
    uploadBtnText.value = "封存";
  }
};

const closeUpload = () => { 
  if(!isSubmitting.value) {
    vibrate(5); // 关闭时的极轻微反馈
    appState.isUploading = false; 
  }
};

// ==========================================
// 🧑‍🚀 时光旅人逻辑 (同步修复)
// ==========================================
const confirmIdentity = async () => {
  const name = identityName.value.trim();
  if (!name) {
    if (window.showToast) window.showToast('契约需留名哦', 'error');
    vibrate(30);
    return;
  }
  
  localStorage.setItem('nickname', name);
  vibrate([15, 30]); // 缔结契约时的双重反馈
  appState.showIdentityModal = false;

  if (appState.pendingCommentAction) {
    const { id, content } = appState.pendingCommentAction;
    try {
      const supabase = createClient(SUPABASE_CONFIG.Url, SUPABASE_CONFIG.Key);
      await supabase.from('comments').insert([{ photo_id: id, nickname: name, content }]);
      if (window.showToast) window.showToast('留印成功', 'success');
      appState.pendingCommentAction = null;
    } catch(err) {
      if (window.showToast) window.showToast('回音迷失在风中', 'error');
    }
  }
};

const closeIdentity = () => {
  vibrate(5);
  appState.showIdentityModal = false;
  appState.pendingCommentAction = null;
};
</script>

<template>
  <Transition name="modal">
    <div class="modal-mask" v-if="appState.isUploading || appState.showIdentityModal" @click.self="closeUpload">
      
      <div class="modal-box" v-if="appState.isUploading">
        <h3 class="modal-title">时光信笺</h3>
        <input type="file" ref="photoFile" accept="image/*" class="input-box file-box" :disabled="isSubmitting">
        <input type="text" v-model="photoTitle" placeholder="给这段回忆起个名字..." class="input-box" autocomplete="off" :disabled="isSubmitting">
        <input type="text" v-model="uploaderName" placeholder="你的署名" class="input-box" autocomplete="off" :disabled="isSubmitting">
        
        <div class="btn-group">
          <button class="btn-shiguang" @click="closeUpload" :disabled="isSubmitting">收起</button>
          <button class="btn-shiguang primary" @click="submitPhoto" :disabled="isSubmitting">
            {{ uploadBtnText }}
          </button>
        </div>
      </div>

      <div class="modal-box" v-if="appState.showIdentityModal">
        <h3 class="modal-title">时光旅人</h3>
        <p class="modal-desc">初次相遇，请留下你的名号。<br>让每一次回音都有迹可循。</p>
        <input type="text" v-model="identityName" placeholder="怎么称呼你？" class="input-box" autocomplete="off">
        
        <div class="btn-group">
          <button class="btn-shiguang" @click="closeIdentity">暂不</button>
          <button class="btn-shiguang primary" @click="confirmIdentity">缔结契约</button>
        </div>
      </div>

    </div>
  </Transition>
</template>

<style scoped>
/* 此处保留你原有的 CSS 样式，无需变动 */
button, input, .modal-mask {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
/* ... 你的其他样式 ... */
</style>
