<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { appState } from '../store/state.js';
import { hasSupabaseConfig } from '../utils/env.js';
import { incrementLike, postComment, vibrate } from '../utils/core.js';
import { getSupabaseClient } from '../utils/supabase.js';

const props = defineProps({ 
  photo: { type: Object, required: true },
  aspectRatio: { type: Number, required: true },
  priority: { type: String, default: 'lazy' },
});

const safeAspectRatio = computed(() => {
  const ratio = props.aspectRatio || 0.75;
  return Math.min(Math.max(ratio, 0.4), 2.5);
});

const imageLoading = computed(() => props.priority === 'high' ? 'eager' : 'lazy');
const imageFetchPriority = computed(() => props.priority === 'high' ? 'high' : 'auto');

const wrapperRef = ref(null);
const isVisible = ref(false);
const isFlipped = ref(false);
const isLiked = ref(false);
const localLikes = ref(props.photo.likes || 0);
const imageLoaded = ref(false);
const showPulse = ref(false);

const comments = ref([]);
const commentText = ref('');
const isSubmittingComment = ref(false);
const isCommentsLoaded = ref(false);
const commentError = ref('');
const isSubmittingLike = ref(false);

const randomAngle = (Math.random() * 3 - 1.5).toFixed(2);

const getHighlightedParts = (text, query) => {
  const source = String(text || '');
  const keyword = String(query || '').trim();
  if (!keyword) return [{ text: source, matched: false }];

  const lowerSource = source.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const parts = [];
  let startIndex = 0;
  let matchIndex = lowerSource.indexOf(lowerKeyword);

  while (matchIndex !== -1) {
    if (matchIndex > startIndex) {
      parts.push({ text: source.slice(startIndex, matchIndex), matched: false });
    }
    parts.push({
      text: source.slice(matchIndex, matchIndex + keyword.length),
      matched: true,
    });
    startIndex = matchIndex + keyword.length;
    matchIndex = lowerSource.indexOf(lowerKeyword, startIndex);
  }

  if (startIndex < source.length) {
    parts.push({ text: source.slice(startIndex), matched: false });
  }

  return parts.length > 0 ? parts : [{ text: source, matched: false }];
};

let appearObserver = null;
let flipObserver = null;
let isKeyboardLocked = false;
const handleFocusIn = (e) => { if (e.target.tagName === 'INPUT') isKeyboardLocked = true; };
const handleFocusOut = (e) => { if (e.target.tagName === 'INPUT') isKeyboardLocked = false; };

const handleGlobalClick = (e) => {
  if (isFlipped.value && wrapperRef.value && !wrapperRef.value.contains(e.target)) isFlipped.value = false;
};

const fetchComments = async () => {
  if (!hasSupabaseConfig) return;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('comments').select('*').eq('photo_id', props.photo.id).order('created_at', { ascending: true });
  if (!error && data) {
    comments.value = data;
    commentError.value = '';
    isCommentsLoaded.value = true;
    return;
  }

  commentError.value = '回音暂时没有接通';
  isCommentsLoaded.value = true;
};

const handleSendComment = async (e) => {
  e.stopPropagation();
  const text = commentText.value.trim();
  if (!text) { vibrate(10); return; }
  if (text.length > 120) {
    if (window.showToast) window.showToast('留言请控制在 120 个字以内', 'error');
    vibrate(20);
    return;
  }
  
  const nickname = localStorage.getItem('nickname');
  if (!nickname) {
    appState.pendingCommentAction = { id: props.photo.id, content: text };
    appState.showIdentityModal = true;
    return;
  }

  isSubmittingComment.value = true;
  commentError.value = '';

  try {
    const insertedComment = await postComment({
      photoId: props.photo.id,
      nickname,
      content: text,
    });

    commentText.value = '';
    comments.value = [...comments.value, insertedComment];
    isCommentsLoaded.value = true;
    vibrate([10, 20]); // 成功发送后的轻微确认震动
    if (window.showToast) window.showToast('回音已经落在这一页', 'success');
  } catch (error) {
    commentError.value = '留言失败，请稍后再试';
    if (window.showToast) window.showToast('留言失败，请稍后再试', 'error');
  } finally {
    isSubmittingComment.value = false;
  }
};

watch(() => appState.showIdentityModal, (newVal) => {
  if (!newVal && isFlipped.value) fetchComments();
});

const toggleFlip = (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
  vibrate(8); // 翻面时的清脆震动
  isFlipped.value = !isFlipped.value;
  if (isFlipped.value && !isCommentsLoaded.value) fetchComments();
};

const handleLike = (e) => {
  e.stopPropagation();
  if (isLiked.value || isSubmittingLike.value) return; 
  vibrate(15); // 点赞的厚实震动
  isSubmittingLike.value = true;
  const previousLikes = localLikes.value;
  isLiked.value = true; localLikes.value++; showPulse.value = true;
  setTimeout(() => { showPulse.value = false; }, 800);
  incrementLike({ photoId: props.photo.id })
    .then((likes) => {
      localLikes.value = likes;
    })
    .catch(() => {
      isLiked.value = false;
      localLikes.value = previousLikes;
      if (window.showToast) window.showToast('点赞失败，请稍后再试', 'error');
    })
    .finally(() => {
      isSubmittingLike.value = false;
    });
};

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    document.addEventListener('click', handleGlobalClick);
  }
  
  appearObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { 
      if (entry.isIntersecting) { 
        requestAnimationFrame(() => { isVisible.value = true; });
        appearObserver.unobserve(entry.target); 
      } 
    });
  }, { threshold: 0.1, rootMargin: '50px' });

  flipObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (!entry.isIntersecting && !isKeyboardLocked && isFlipped.value) isFlipped.value = false; });
  }, { threshold: 0.2 });

  if (wrapperRef.value) { appearObserver.observe(wrapperRef.value); flipObserver.observe(wrapperRef.value); }
});

onBeforeUnmount(() => {
  if (appearObserver) appearObserver.disconnect();
  if (flipObserver) flipObserver.disconnect();
  if (typeof document !== 'undefined') {
    document.removeEventListener('focusin', handleFocusIn);
    document.removeEventListener('focusout', handleFocusOut);
    document.removeEventListener('click', handleGlobalClick);
  }
});
</script>

<template>
  <div ref="wrapperRef" class="card-wrapper" :class="{ 'is-visible': isVisible }" :style="`--random-angle: ${randomAngle}deg;`">
    <div class="card-inner" :class="{ 'is-flipped': isFlipped }" @click="toggleFlip">
      
      <div class="card-front">
        <div class="img-container" :style="{ aspectRatio: safeAspectRatio }">
          <img 
            :src="photo.image_url" 
            :loading="imageLoading"
            :fetchpriority="imageFetchPriority"
            decoding="async"
            :class="{ 'loaded': imageLoaded }" 
            @load="imageLoaded = true" 
            @error="imageLoaded = true" 
            alt="岁月碎片" 
          />
        </div>
        <div class="card-info">
          <p class="card-title">
            <span
              v-for="(part, index) in getHighlightedParts(photo.title, appState.searchQuery)"
              :key="`title-${photo.id}-${index}`"
              :class="{ 'highlight-text': part.matched }"
            >{{ part.text }}</span>
          </p>
          <p class="card-author">
            @<span
              v-for="(part, index) in getHighlightedParts(photo.author, appState.searchQuery)"
              :key="`author-${photo.id}-${index}`"
              :class="{ 'highlight-text': part.matched }"
            >{{ part.text }}</span>
          </p>
          <button class="like-btn" :class="{ 'liked': isLiked }" @click="handleLike">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.17 2.02c-.17.01-.35.03-.52.06-1.54.26-3.08 1.05-4.32 2.29-1.24 1.24-2.03 2.78-2.29 4.32-.26 1.54.03 3.12.83 4.47l-3.32 3.32c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l3.32-3.32c1.35.8 2.93 1.09 4.47.83 1.54-.26 3.08-1.05 4.32-2.29 1.24-1.24 2.03-2.78 2.29-4.32.26-1.54-.03-3.12-.83-4.47l.5-.5c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0l-.5.5c-1.04-.62-2.26-.95-3.48-.97zM11 9c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"/>
            </svg>
            <span>{{ localLikes }}</span>
            <div v-if="showPulse" class="pulse-ring"></div>
            <div v-if="showPulse" class="float-plus">+1</div>
          </button>
        </div>
      </div>

      <div class="card-back">
        <div class="back-header">拾光回音</div>
        <div class="comments-list">
          <div v-if="!hasSupabaseConfig" class="empty-comment-tip">评论功能暂未开放配置。</div>
          <div v-else-if="!isCommentsLoaded" class="empty-comment-tip" style="opacity: 0.4;">打捞回音中...</div>
          <div v-else-if="commentError" class="empty-comment-tip">{{ commentError }}</div>
          <div v-else-if="comments.length === 0" class="empty-comment-tip">写下第一句共鸣吧。</div>
          <div v-else v-for="c in comments" :key="c.id" class="comment-item">
            <span style="color:var(--accent-color); font-weight:700;">{{ c.nickname }}</span>
            <span style="color:var(--text-muted); margin:0 4px;">:</span>
            <span style="color:var(--text-dark)">{{ c.content }}</span>
          </div>
        </div>
        <div class="comment-input-box">
          <input type="text" v-model="commentText" placeholder="落笔共鸣..." autocomplete="off" maxlength="120" @keydown.enter="handleSendComment" :disabled="isSubmittingComment || !hasSupabaseConfig">
          <button @click="handleSendComment" :disabled="isSubmittingComment || !hasSupabaseConfig">{{ isSubmittingComment ? '寄送中' : '留印' }}</button>
        </div>
        <div class="comment-meta">{{ commentText.trim().length }}/120</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ✨ 增加基础触控优化，消除手机点击延迟与蓝光闪烁 */
button, input, .card-inner {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.card-wrapper { 
  transform: translate3d(0, 40px, 0) rotate(0deg); 
  opacity: 0; 
  transition: opacity 0.7s ease, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1); 
  will-change: opacity, transform; 
  perspective: 1200px; 
  position: relative; 
}
.card-wrapper.is-visible { 
  opacity: 1; 
  transform: translate3d(0, 0, 0) rotate(var(--random-angle, 0deg)); 
}

.card-inner { position: relative; width: 100%; transform-style: preserve-3d; transition: transform 0.85s cubic-bezier(0.34, 1.56, 0.64, 1); cursor: pointer; border-radius: 18px; will-change: transform; }
.card-inner.is-flipped { transform: rotateY(180deg); }

@media (hover: hover) { 
  .card-wrapper:hover .card-inner:not(.is-flipped) { transform: translate3d(0, -6px, 10px) scale(1.02) rotate(0.2deg); box-shadow: 0 25px 50px rgba(140, 161, 146, 0.15); } 
}

.card-front, .card-back { position: relative; width: 100%; backface-visibility: hidden; border-radius: 18px; background: var(--glass-bg, rgba(255,255,255,0.95)); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); border: 1px solid var(--glass-border); box-shadow: var(--shadow-soft); padding: 14px 14px 20px 14px; }
.card-back { position: absolute; top: 0; left: 0; height: 100%; transform: rotateY(180deg); display: flex; flex-direction: column; padding: 0; overflow: hidden; }

.img-container { width: 100%; border-radius: 12px; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; background: transparent; contain: content; }
.img-container::before { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, rgba(140,161,146,0.02) 25%, rgba(140,161,146,0.08) 50%, rgba(140,161,146,0.02) 75%); background-size: 200% 100%; animation: skeletonLoading 1.5s infinite; }
@keyframes skeletonLoading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.img-container img { width: 100%; height: 100%; object-fit: contain; display: block; opacity: 0; transition: opacity 0.5s ease; }
.img-container img.loaded { opacity: 1; }

:deep(.highlight-text) { color: var(--accent-color); font-weight: 800; background: rgba(140, 161, 146, 0.15); border-radius: 4px; padding: 0 4px; box-shadow: 0 0 8px rgba(140, 161, 146, 0.2); transition: all 0.3s ease; }
.card-info { padding-top: 18px; position: relative; text-align: center; }
.card-title { margin: 0 0 6px; font-size: 15px; font-weight: 700; color: var(--text-dark); line-height: 1.4; }
.card-author { margin: 0; font-size: 12px; color: var(--text-muted); font-style: italic; }

.like-btn { position: absolute; right: 0; bottom: -2px; background: transparent; border: none; display: flex; align-items: center; gap: 6px; color: var(--accent-color); font-size: 13px; font-weight: 700; cursor: pointer; transition: 0.3s; }
.like-btn svg { width: 18px; height: 18px; transition: 0.4s var(--cubic-bounce); transform-origin: bottom center; }
.like-btn.liked svg { transform: rotate(15deg) scale(1.2); filter: drop-shadow(0 4px 6px rgba(140, 161, 146, 0.4)); }
.pulse-ring { position: absolute; left: 10px; top: 10px; width: 10px; height: 10px; border-radius: 50%; pointer-events: none; transform: translate(-50%, -50%); animation: chromaticPulse 0.8s ease-out forwards; }
@keyframes chromaticPulse { 0% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 0 0 rgba(140,161,146,0.8), -2px 0 5px rgba(255,100,100,0.5), 2px 0 5px rgba(100,255,255,0.5); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(3.5); box-shadow: 0 0 20px 10px rgba(140,161,146,0), -5px 0 10px rgba(255,100,100,0), 5px 0 10px rgba(100,255,255,0); opacity: 0; } }
.float-plus { position: absolute; right: 10px; top: -15px; color: var(--accent-color); font-weight: bold; font-size: 14px; pointer-events: none; animation: floatUpText 0.8s forwards var(--cubic-smooth); }
@keyframes floatUpText { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-25px) scale(1.2); } }

.back-header { padding: 18px 20px; border-bottom: 1px solid rgba(0,0,0,0.03); display: flex; justify-content: center; align-items: center; font-size: 14px; font-weight: 700; color: var(--accent-color); background: rgba(140,161,146,0.05); letter-spacing: 4px; }
.comments-list { flex: 1; padding: 20px; overflow-y: auto; font-size: 13px; scrollbar-width: none; text-align: left; }
.comments-list::-webkit-scrollbar { display: none; }
.comment-item { margin-bottom: 16px; line-height: 1.6; animation: fadeInSmooth 0.5s ease backwards; }
.empty-comment-tip { text-align: center; padding: 30px 20px; color: var(--text-muted); font-style: italic; }
@keyframes fadeInSmooth { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.comment-input-box { padding: 14px; border-top: 1px solid rgba(0,0,0,0.04); display: flex; gap: 10px; background: #fff; border-radius: 0 0 18px 18px;}
.comment-input-box input { flex: 1; padding: 12px 15px; border: 1px solid #E8EDE9; border-radius: 14px; font-size: 13px; outline: none; background: #F7F9F8; transition: 0.3s; }
.comment-input-box input:focus { border-color: var(--accent-color); background: #fff; box-shadow: 0 2px 10px rgba(140,161,146,0.1); }
.comment-input-box button { background: var(--accent-color); color: white; border: none; border-radius: 12px; padding: 0 18px; font-size: 13px; font-weight: bold; cursor: pointer; transition: 0.3s; }
.comment-input-box button:active { transform: scale(0.95) translateY(2px); }
.comment-input-box button:disabled { opacity: 0.6; cursor: not-allowed; }
.comment-meta { padding: 0 16px 12px; text-align: right; font-size: 11px; color: var(--text-muted); background: #fff; }

/* ✨ 修复：针对手机屏幕进行全方位的等比例缩小，背面也完美适配！ */
@media (max-width: 768px) {
  /* 强制去除旋转角度，防止边缘溢出 */
  .card-wrapper.is-visible { transform: translate3d(0, 0, 0) rotate(0deg) !important; }
  
  /* 正面优化 */
  .card-front { padding: 10px 10px 14px 10px; border-radius: 14px; }
  .card-info { padding-top: 12px; }
  .card-title { font-size: 14px; margin-bottom: 4px; }
  .card-author { font-size: 11px; }
  .like-btn { font-size: 12px; bottom: 0; }
  .like-btn svg { width: 16px; height: 16px; }
  
  /* 背面优化：全面缩小内边距与字体，拒绝“大字报” */
  .card-back { border-radius: 14px; }
  .back-header { padding: 12px 15px; font-size: 12px; letter-spacing: 2px; }
  .comments-list { padding: 15px; font-size: 12px; }
  .comment-item { margin-bottom: 12px; }
  .empty-comment-tip { padding: 20px 10px; font-size: 12px; }
  
  /* 评论输入框极简适配 */
  .comment-input-box { padding: 10px; gap: 8px; border-radius: 0 0 14px 14px; }
  .comment-input-box input { padding: 10px 12px; font-size: 12px; border-radius: 10px; }
  .comment-input-box button { padding: 0 14px; font-size: 12px; border-radius: 10px; }
  .comment-meta { padding: 0 12px 10px; font-size: 10px; }
}
</style>
