<script setup>
import { ref, onMounted } from 'vue';
import { hasSupabaseConfig } from '../utils/env.js';
import { getSupabaseClient } from '../utils/supabase.js';

const views = ref(0);
const loaded = ref(false);

onMounted(async () => {
  if (!hasSupabaseConfig) return;
  try {
    const supabase = getSupabaseClient();
    // Try to increment and fetch view count from a simple 'stats' table
    // If the table doesn't exist, we gracefully fail
    const { data, error } = await supabase.rpc('increment_views');
    if (!error && typeof data === 'number') {
      views.value = data;
      loaded.value = true;
    } else {
      // Fallback: try to read from stats table directly
      const { data: stats } = await supabase
        .from('stats')
        .select('value')
        .eq('key', 'page_views')
        .single();
      if (stats?.value) {
        views.value = Number(stats.value);
        loaded.value = true;
      }
    }
  } catch {
    // Stats table likely doesn't exist — that's fine, just hide
  }
});
</script>

<template>
  <footer class="site-footer">
    <p class="footer-text">
      <span v-if="loaded" class="view-count">已被翻阅 {{ views.toLocaleString() }} 次</span>
      <span class="footer-sep" v-if="loaded">·</span>
      <span class="footer-credit">拾光集 — 记忆的容器</span>
    </p>
  </footer>
</template>

<style scoped>
.site-footer {
  padding: 60px 20px 40px;
  text-align: center;
}
.footer-text {
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}
.view-count { opacity: 0.7; }
.footer-sep { opacity: 0.3; }
.footer-credit { font-style: italic; opacity: 0.5; }
</style>
