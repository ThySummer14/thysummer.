<script setup>
/**
 * @file src/components/Modals.vue
 * @description 全局模态框引擎 - 探针级上传与安卓触感调优
 */
import { ref, onMounted, watch } from 'vue';
import { appState, prependPhoto } from '../store/state.js';
import { hasSupabaseConfig, hasUploadEndpoint } from '../utils/env.js';
import { postComment, vibrate, uploadMemory } from '../utils/core.js';
import { getSupabaseClient } from '../utils/supabase.js';

// --- 上传信笺状态 ---
const photoFile = ref(null);
const photoTitle = ref('');
const uploaderName = ref('');
const uploadBtnText = ref('封存');
const isSubmitting = ref(false);
const uploadPreviewUrl = ref('');
const uploadMeta = ref('');

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

const clearUploadDraft = () => {
  photoTitle.value = '';
  uploadMeta.value = '';
  if (photoFile.value) photoFile.value.value = '';
  if (uploadPreviewUrl.value && typeof URL !== 'undefined') {
    URL.revokeObjectURL(uploadPreviewUrl.value);
  }
  uploadPreviewUrl.value = '';
};

const getUploadErrorMessage = (error) => {
  const code = String(error?.code || '');

  if (code === 'INVALID_FILE_TYPE') return '只支持 jpg、png、webp 图片';
  if (code === 'FILE_TOO_LARGE') return '图片请控制在 6MB 以内';
  if (code === 'MISSING_FIELDS') return '标题和署名都要填写完整';
  if (code === 'INVALID_METADATA') return '标题或署名太长了，请缩短后再试';
  if (code === 'MISSING_ENV') return '上传服务环境变量还没配置完整';

  return '上传失败，请稍后再试';
};

const handleFileChange = (event) => {
  const file = event.target?.files?.[0];
  if (!file) {
    uploadMeta.value = '';
    if (uploadPreviewUrl.value && typeof URL !== 'undefined') {
      URL.revokeObjectURL(uploadPreviewUrl.value);
    }
    uploadPreviewUrl.value = '';
    return;
  }

  const isImage = file.type.startsWith('image/');
  if (!isImage) {
    if (window.showToast) window.showToast('只支持上传图片文件', 'error');
    if (photoFile.value) photoFile.value.value = '';
    return;
  }

  const maxSize = 6 * 1024 * 1024;
  if (file.size > maxSize) {
    if (window.showToast) window.showToast('图片请控制在 6MB 以内', 'error');
    if (photoFile.value) photoFile.value.value = '';
    return;
  }

  if (uploadPreviewUrl.value && typeof URL !== 'undefined') {
    URL.revokeObjectURL(uploadPreviewUrl.value);
  }

  uploadPreviewUrl.value = URL.createObjectURL(file);
  uploadMeta.value = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
};

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
    if (import.meta.env.DEV) {
      console.error("🖼️ 图片压缩失败:", e);
    }
    return file; // 降级处理：直接返回原文件
  }
}

// ==========================================
// 🌌 核心：投递逻辑 (接入探针引擎)
// ==========================================
const submitPhoto = async () => {
  if (!hasUploadEndpoint) {
    if (window.showToast) window.showToast("上传服务尚未完成配置", "error");
    return;
  }

  const file = photoFile.value?.files[0];
  if (!file || !photoTitle.value.trim() || !uploaderName.value.trim()) {
    if (window.showToast) window.showToast("墨水似乎不够，请填写完整", "error");
    vibrate(40); 
    return;
  }

  if (photoTitle.value.trim().length > 40) {
    if (window.showToast) window.showToast("标题请控制在 40 个字以内", "error");
    vibrate(30);
    return;
  }

  if (uploaderName.value.trim().length > 20) {
    if (window.showToast) window.showToast("署名请控制在 20 个字以内", "error");
    vibrate(30);
    return;
  }

  isSubmitting.value = true;
  vibrate(15); 
  localStorage.setItem('nickname', uploaderName.value.trim());

  try {
    uploadBtnText.value = "压缩图谱...";
    const finalFile = await compressImage(file);

    uploadBtnText.value = "跨越星海...";
    const insertedPhoto = await uploadMemory({
      file: finalFile,
      title: photoTitle.value.trim(),
      author: uploaderName.value.trim(),
    });

    if (window.showToast) {
      window.showToast(
        insertedPhoto?.is_visible === false ? "信笺已封存，等待后台公开" : "信笺已封存",
        "success"
      );
    }
    
    vibrate([20, 50, 20]); 
    
    // 自动重置并关闭
    clearUploadDraft();
    appState.isUploading = false;
    if (insertedPhoto?.is_visible !== false) {
      prependPhoto(insertedPhoto);
    }

  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("❌ 投递流程意外中断:", err);
    }
    if (window.showToast) window.showToast(getUploadErrorMessage(err), "error");
    vibrate([50, 100, 50]); 
  } finally {
    isSubmitting.value = false;
    uploadBtnText.value = "封存";
  }
};

const closeUpload = () => { 
  if(!isSubmitting.value) {
    vibrate(5); 
    clearUploadDraft();
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
  vibrate([15, 30]); 
  appState.showIdentityModal = false;

  if (!hasSupabaseConfig) {
    appState.pendingCommentAction = null;
    return;
  }

  if (appState.pendingCommentAction) {
    const { id, content } = appState.pendingCommentAction;
    try {
      await postComment({
        photoId: id,
        nickname: name,
        content,
      });
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
        <input type="file" ref="photoFile" accept="image/*" class="input-box file-box" :disabled="isSubmitting" @change="handleFileChange">
        <p class="helper-text">支持常见图片格式，建议上传竖图或生活瞬间。</p>

        <div v-if="uploadPreviewUrl" class="preview-card">
          <img :src="uploadPreviewUrl" alt="上传预览" class="preview-image">
          <p class="preview-meta">{{ uploadMeta }}</p>
        </div>

        <input type="text" v-model="photoTitle" placeholder="给这段回忆起个名字..." class="input-box" autocomplete="off" maxlength="40" :disabled="isSubmitting">
        <div class="field-meta">{{ photoTitle.trim().length }}/40</div>
        <input type="text" v-model="uploaderName" placeholder="你的署名" class="input-box" autocomplete="off" maxlength="20" :disabled="isSubmitting">
        <div class="field-meta">{{ uploaderName.trim().length }}/20</div>
        
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
/* 全局遮罩 - 玻璃拟态 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
  touch-action: manipulation;
}

/* 弹窗本体 - 丝滑阴影与圆角 */
.modal-box {
  background: rgba(255, 255, 255, 0.95);
  padding: 40px 30px;
  border-radius: 28px;
  width: 90%;
  max-width: 360px;
  text-align: center;
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--glass-border, rgba(255,255,255,0.9));
}

.modal-title {
  margin: 0 0 20px;
  color: var(--accent-color, #8CA192);
  letter-spacing: 2px;
  font-size: 1.2rem;
}

.modal-desc {
  font-size: 13px;
  color: var(--text-muted, #8B9992);
  margin-bottom: 25px;
  line-height: 1.6;
}

.helper-text,
.field-meta,
.preview-meta {
  font-size: 12px;
  color: var(--text-muted, #8B9992);
}

.helper-text {
  margin: -6px 0 14px;
}

.field-meta {
  text-align: right;
  margin: -10px 4px 14px 0;
}

/* 晨雾青输入框设计 */
.input-box {
  width: 100%;
  padding: 15px;
  margin-bottom: 18px;
  border: 1px solid #E8EDE9;
  border-radius: 14px;
  background: #F7F9F8;
  text-align: center;
  outline: none;
  font-family: inherit;
  font-size: 14px;
  transition: all 0.3s ease;
  color: #2C3631;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.input-box:focus {
  border-color: var(--accent-color, #8CA192);
  background: #fff;
  box-shadow: 0 4px 15px rgba(140, 161, 146, 0.1);
}

.file-box {
  border-style: dashed;
  cursor: pointer;
  padding: 12px;
}

.preview-card {
  margin-bottom: 18px;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(140, 161, 146, 0.08);
  border: 1px solid rgba(140, 161, 146, 0.15);
}

.preview-image {
  display: block;
  width: 100%;
  max-height: 220px;
  object-fit: cover;
}

.preview-meta {
  padding: 10px 12px 12px;
  text-align: center;
}

.btn-group {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.btn-shiguang {
  flex: 1;
  justify-content: center;
  background: transparent;
  color: var(--text-dark, #2C3631);
  border: 1px solid rgba(140, 161, 146, 0.3);
  padding: 12px 0;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.btn-shiguang.primary {
  background: var(--accent-color, #8CA192);
  color: white;
  border-color: transparent;
}

.btn-shiguang:active:not(:disabled) {
  transform: scale(0.95);
}

.btn-shiguang:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ================= 核心：Vue Transition 物理动画 ================= */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.4s ease;
}
.modal-enter-active .modal-box {
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-leave-active .modal-box {
  transition: transform 0.4s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-box {
  transform: scale(0.95) translateY(20px);
}
.modal-leave-to .modal-box {
  transform: scale(0.95) translateY(-20px);
}
</style>
