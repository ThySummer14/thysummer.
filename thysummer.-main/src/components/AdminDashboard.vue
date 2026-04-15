<script setup>
import { computed, ref } from 'vue';
import { hasUploadServiceBase, uploadServiceBase } from '../utils/env.js';

const adminToken = ref('');
const isAuthenticating = ref(false);
const isReady = ref(false);
const activeTab = ref('photos');
const authError = ref('');
const panelError = ref('');

const photos = ref([]);
const comments = ref([]);
const photosLoading = ref(false);
const commentsLoading = ref(false);

const serviceBase = computed(() => uploadServiceBase);
const canUseAdmin = computed(() => hasUploadServiceBase);

const getAdminErrorMessage = (error) => {
  const status = Number(error?.status || 0);

  if (status === 401) {
    return '管理员令牌不正确，请重新输入后再试。';
  }

  if (status === 404) {
    return '后台接口地址不对，或者 EdgeOne Pages 的 API 还没有部署成功。';
  }

  if (status >= 500) {
    return '后台服务报错了，请稍后重试，并检查 Vercel 日志。';
  }

  if (!serviceBase.value) {
    return '当前站点还没有配置后台服务地址。';
  }

  return '后台服务暂时不可用，请检查接口地址和网络连接。';
};

const requestAdmin = async (path, options = {}) => {
  const response = await fetch(`${serviceBase.value}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken.value.trim(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = new Error(`ADMIN_REQUEST_FAILED_${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
};

const loadPhotos = async () => {
  photosLoading.value = true;
  try {
    const payload = await requestAdmin('/admin/photos', { method: 'GET' });
    photos.value = payload.photos || [];
    panelError.value = '';
  } finally {
    photosLoading.value = false;
  }
};

const loadComments = async () => {
  commentsLoading.value = true;
  try {
    const payload = await requestAdmin('/admin/comments', { method: 'GET' });
    comments.value = payload.comments || [];
    panelError.value = '';
  } finally {
    commentsLoading.value = false;
  }
};

const connectAdmin = async () => {
  if (!canUseAdmin.value) {
    authError.value = '当前站点还没有配置 `PUBLIC_UPLOAD_ENDPOINT`。';
    return;
  }

  if (!adminToken.value.trim()) {
    authError.value = '请输入管理员令牌。';
    return;
  }

  isAuthenticating.value = true;
  authError.value = '';

  try {
    await Promise.all([loadPhotos(), loadComments()]);
    isReady.value = true;
    panelError.value = '';
  } catch (error) {
    isReady.value = false;
    authError.value = getAdminErrorMessage(error);
  } finally {
    isAuthenticating.value = false;
  }
};

const togglePhotoVisibility = async (photo) => {
  const nextVisible = !photo.is_visible;
  const previousVisible = photo.is_visible;
  photo.is_visible = nextVisible;

  try {
    const payload = await requestAdmin(`/admin/photos/${photo.id}/visibility`, {
      method: 'POST',
      body: JSON.stringify({ isVisible: nextVisible }),
    });
    photo.is_visible = payload.photo?.is_visible ?? nextVisible;
    panelError.value = '';
  } catch (error) {
    photo.is_visible = previousVisible;
    panelError.value = getAdminErrorMessage(error);
  }
};

const toggleCommentVisibility = async (comment) => {
  const nextVisible = !comment.is_visible;
  const previousVisible = comment.is_visible;
  comment.is_visible = nextVisible;

  try {
    const payload = await requestAdmin(`/admin/comments/${comment.id}/visibility`, {
      method: 'POST',
      body: JSON.stringify({ isVisible: nextVisible }),
    });
    comment.is_visible = payload.comment?.is_visible ?? nextVisible;
    panelError.value = '';
  } catch (error) {
    comment.is_visible = previousVisible;
    panelError.value = getAdminErrorMessage(error);
  }
};

const visiblePhotoCount = computed(() => photos.value.filter((photo) => photo.is_visible).length);
const hiddenPhotoCount = computed(() => photos.value.length - visiblePhotoCount.value);
const visibleCommentCount = computed(() => comments.value.filter((comment) => comment.is_visible).length);
</script>

<template>
  <main class="admin-shell">
    <section class="admin-hero">
      <p class="eyebrow">拾光集后台</p>
      <h1>审核照片与评论</h1>
      <p class="hero-copy">这是一个最小管理入口。管理员令牌不会写进前端代码，而是由你打开页面时临时输入。</p>
    </section>

    <section class="admin-card login-card">
      <div class="field-row">
        <input
          v-model="adminToken"
          type="password"
          class="token-input"
          placeholder="输入管理员令牌"
          autocomplete="off"
        >
        <button class="action-btn primary" :disabled="isAuthenticating" @click="connectAdmin">
          {{ isAuthenticating ? '连接中...' : '进入后台' }}
        </button>
      </div>
      <p v-if="authError" class="error-text">{{ authError }}</p>
      <p v-else class="helper-text">后台接口地址会自动从 `PUBLIC_UPLOAD_ENDPOINT` 推导，例如 `.../api/upload` 会推导成 `.../api`。</p>
    </section>

    <section v-if="isReady" class="admin-grid">
      <p v-if="panelError" class="error-banner">{{ panelError }}</p>

      <div class="stats-row">
        <article class="stat-card">
          <span>照片总数</span>
          <strong>{{ photos.length }}</strong>
          <small>显示中 {{ visiblePhotoCount }} / 隐藏 {{ hiddenPhotoCount }}</small>
        </article>
        <article class="stat-card">
          <span>评论总数</span>
          <strong>{{ comments.length }}</strong>
          <small>显示中 {{ visibleCommentCount }}</small>
        </article>
      </div>

      <div class="tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'photos' }" @click="activeTab = 'photos'">照片</button>
        <button class="tab-btn" :class="{ active: activeTab === 'comments' }" @click="activeTab = 'comments'">评论</button>
      </div>

      <section v-if="activeTab === 'photos'" class="admin-card">
        <div class="section-head">
          <h2>照片审核</h2>
          <button class="action-btn" :disabled="photosLoading" @click="loadPhotos">刷新</button>
        </div>
        <div v-if="photosLoading" class="placeholder-state">正在同步照片列表...</div>
        <div v-else-if="photos.length === 0" class="placeholder-state">还没有照片记录。</div>
        <div v-else class="photo-list">
          <article v-for="photo in photos" :key="photo.id" class="photo-row">
            <img :src="photo.image_url" alt="照片缩略图" class="thumb">
            <div class="row-body">
              <div class="row-title">
                <h3>{{ photo.title }}</h3>
                <span class="status-pill" :class="{ hidden: !photo.is_visible }">
                  {{ photo.is_visible ? '公开中' : '待公开' }}
                </span>
              </div>
              <p>@{{ photo.author }}</p>
              <small>{{ new Date(photo.created_at).toLocaleString() }} · {{ photo.likes }} 赞</small>
            </div>
            <button class="action-btn" :class="{ primary: !photo.is_visible }" @click="togglePhotoVisibility(photo)">
              {{ photo.is_visible ? '隐藏' : '恢复显示' }}
            </button>
          </article>
        </div>
      </section>

      <section v-else class="admin-card">
        <div class="section-head">
          <h2>评论审核</h2>
          <button class="action-btn" :disabled="commentsLoading" @click="loadComments">刷新</button>
        </div>
        <div v-if="commentsLoading" class="placeholder-state">正在同步评论列表...</div>
        <div v-else-if="comments.length === 0" class="placeholder-state">还没有评论记录。</div>
        <div v-else class="comment-list">
          <article v-for="comment in comments" :key="comment.id" class="comment-row">
            <div class="row-body">
              <h3>{{ comment.nickname }}</h3>
              <p>{{ comment.content }}</p>
              <small>photo_id: {{ comment.photo_id }} · {{ new Date(comment.created_at).toLocaleString() }}</small>
            </div>
            <button class="action-btn" :class="{ primary: !comment.is_visible }" @click="toggleCommentVisibility(comment)">
              {{ comment.is_visible ? '隐藏' : '恢复显示' }}
            </button>
          </article>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
.admin-shell {
  max-width: 1120px;
  margin: 0 auto;
  padding: 48px 20px 80px;
}

.admin-hero {
  text-align: center;
  margin-bottom: 28px;
}

.eyebrow {
  letter-spacing: 0.3em;
  text-transform: uppercase;
  font-size: 12px;
  color: var(--accent-color);
  margin-bottom: 12px;
}

.admin-hero h1 {
  font-size: clamp(32px, 6vw, 56px);
  margin-bottom: 12px;
}

.hero-copy {
  max-width: 720px;
  margin: 0 auto;
  line-height: 1.8;
  color: var(--text-muted);
}

.admin-card {
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.88);
  box-shadow: var(--shadow-float);
  border-radius: 28px;
  padding: 24px;
  backdrop-filter: blur(20px);
}

.login-card {
  margin-bottom: 24px;
}

.field-row {
  display: flex;
  gap: 12px;
}

.token-input {
  flex: 1;
  border: 1px solid rgba(140, 161, 146, 0.2);
  border-radius: 16px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.75);
  font: inherit;
}

.action-btn {
  border: 1px solid rgba(140, 161, 146, 0.25);
  background: white;
  color: var(--text-dark);
  border-radius: 16px;
  padding: 12px 18px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.action-btn.primary {
  background: var(--accent-color);
  color: white;
  border-color: transparent;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.helper-text,
.error-text {
  margin-top: 12px;
  font-size: 13px;
}

.helper-text {
  color: var(--text-muted);
}

.error-text {
  color: #b34b4b;
}

.admin-grid {
  display: grid;
  gap: 20px;
}

.error-banner {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(179, 75, 75, 0.12);
  color: #8b2f2f;
  border: 1px solid rgba(179, 75, 75, 0.18);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.72);
  border-radius: 24px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.88);
}

.stat-card span,
.stat-card small {
  display: block;
  color: var(--text-muted);
}

.stat-card strong {
  display: block;
  font-size: 32px;
  margin: 8px 0;
}

.tabs {
  display: flex;
  gap: 10px;
}

.tab-btn {
  border: none;
  background: rgba(255, 255, 255, 0.72);
  color: var(--text-dark);
  padding: 12px 18px;
  border-radius: 999px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.tab-btn.active {
  background: var(--text-dark);
  color: white;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.section-head h2 {
  font-size: 22px;
}

.placeholder-state {
  padding: 28px 10px;
  text-align: center;
  color: var(--text-muted);
}

.photo-list,
.comment-list {
  display: grid;
  gap: 14px;
}

.photo-row,
.comment-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border-radius: 20px;
  background: rgba(247, 249, 248, 0.88);
}

.thumb {
  width: 88px;
  height: 88px;
  border-radius: 18px;
  object-fit: cover;
  background: #e8ede9;
}

.row-body h3 {
  margin-bottom: 6px;
  font-size: 16px;
}

.row-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.status-pill {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  color: #506258;
  background: rgba(140, 161, 146, 0.16);
}

.status-pill.hidden {
  color: #8b5e38;
  background: rgba(219, 184, 135, 0.22);
}

.row-body p,
.row-body small {
  color: var(--text-muted);
  line-height: 1.6;
}

@media (max-width: 720px) {
  .field-row,
  .stats-row,
  .photo-row,
  .comment-row {
    grid-template-columns: 1fr;
  }

  .thumb {
    width: 100%;
    height: 180px;
  }

  .tabs {
    flex-wrap: wrap;
  }
}
</style>
