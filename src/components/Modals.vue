<script setup>
/**
 * @file src/components/Modals.vue
 * @description 全局模态框引擎 - 离屏压缩与身份校验
 */
import { ref, onMounted, watch } from 'vue';
import { appState } from '../store/state.js';
import { vibrate, COS_CONFIG, SUPABASE_CONFIG } from '../utils/core.js';

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

// 每次打开上传面板，同步最新昵称
watch(() => appState.isUploading, (newVal) => {
  if (newVal && typeof window !== 'undefined') {
    uploaderName.value = localStorage.getItem('nickname') || '';
  }
});

// ==========================================
// 🚀 核心：离屏图像处理引擎 (OffscreenCanvas)
// ==========================================
async function compressImage(file) {
  const bitmap = await window.createImageBitmap(file);
  let w = bitmap.width, h = bitmap.height;
  // 限制最大边长为 1200px
  if (w > 1200) { h = Math.round(h * (1200 / w)); w = 1200; }

  // 极限性能：使用 Web Worker 的离屏渲染，防止主线程掉帧
  if (window.OffscreenCanvas) {
    const oc = new window.OffscreenCanvas(w, h);
    const ctx = oc.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return oc.convertToBlob({ type: 'image/webp', quality: 0.82 });
  } else {
    // 优雅降级
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return new Promise(res => canvas.toBlob(res, 'image/webp', 0.82));
  }
}

const submitPhoto = async () => {
  const file = photoFile.value?.files[0];
  if (!file || !photoTitle.value.trim() || !uploaderName.value.trim()) {
    if (window.showToast) window.showToast("墨水似乎不够，请填写完整", "error");
    return;
  }

  isSubmitting.value = true;
  vibrate(20);
  localStorage.setItem('nickname', uploaderName.value.trim());

  try {
    uploadBtnText.value = "压缩图谱...";
    const finalFile = await compressImage(file);

    uploadBtnText.value = "跨越星海...";
    // 动态调用全局 SDK (由 Astro 注入)
    const cos = new window.COS({ SecretId: COS_CONFIG.SecretId, SecretKey: COS_CONFIG.SecretKey });
    const path = `photos/${Date.now()}.webp`;

    const cosRes = await new Promise((res, rej) => {
      cos.putObject({
        Bucket: COS_CONFIG.Bucket, Region: COS_CONFIG.Region,
        Key: path, Body: finalFile
      }, (err, data) => err ? rej(err) : res(data));
    });

    uploadBtnText.value = "落笔生花...";
    const supabase = window.supabase.createClient(SUPABASE_CONFIG.Url, SUPABASE_CONFIG.Key);
    await supabase.from('photos').insert([{
      title: photoTitle.value.trim(),
      author: uploaderName.value.trim(),
      image_url: `https://${cosRes.Location}`
    }]);

    if (window.showToast) window.showToast("信笺已封存", "success");
    vibrate([20, 40, 20]);
    
    // 清理并关闭
    photoTitle.value = '';
    if (photoFile.value) photoFile.value.value = '';
    appState.isUploading = false;
    
    // 触发页面重载 (如果需要完全解耦，建议刷新浏览器或重新执行 fetch)
    setTimeout(() => window.location.reload(), 1500);
  } catch (err) {
    if (window.showToast) window.showToast("星空拥堵，请重试", "error");
  } finally {
    isSubmitting.value = false;
    uploadBtnText.value = "封存";
  }
};

const closeUpload = () => { if(!isSubmitting.value) appState.isUploading = false; };

// ==========================================
// 🧑‍🚀 时光旅人：身份契约拦截逻辑
// ==========================================
const confirmIdentity = async () => {
  const name = identityName.value.trim();
  if (!name) {
    if (window.showToast) window.showToast('契约需留名哦', 'error');
    return;
  }
  
  localStorage.setItem('nickname', name);
  appState.showIdentityModal = false;

  // 如果有未完成的评论动作，继续执行
  if (appState.pendingCommentAction) {
    const { id, content } = appState.pendingCommentAction;
    try {
      const supabase = window.supabase.createClient(SUPABASE_CONFIG.Url, SUPABASE_CONFIG.Key);
      await supabase.from('comments').insert([{ photo_id: id, nickname: name, content }]);
      if (window.showToast) window.showToast('留印成功', 'success');
      appState.pendingCommentAction = null;
    } catch(err) {
      if (window.showToast) window.showToast('回音迷失在风中', 'error');
    }
  }
};

const closeIdentity = () => {
  appState.showIdentityModal = false;
  appState.pendingCommentAction = null;
};
</script>

<template>
  <Transition name="modal">
    <div class="modal-mask" v-if="appState.isUploading || appState.showIdentityModal">
      
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