/**
 * @file src/store/state.js
 * @description Vue 3 响应式状态中心 (Phase 5 最终完全体)
 */
import { reactive, computed } from 'vue';

export const appState = reactive({
    // 基础数据源
    photos: [],             
    currentMode: 'gallery', 
    searchQuery: '',        
    
    // 全局模态框状态 (状态驱动UI)
    isUploading: false,         // 时光信笺 (上传弹窗)
    showIdentityModal: false,   // 时光旅人 (身份确认弹窗)
    
    // 动作暂存区 (解决未登录时评论被中断的问题)
    pendingCommentAction: null  
});

// 核心内存检索逻辑
export const filteredPhotos = computed(() => {
    const q = appState.searchQuery.toLowerCase().trim();
    if (!q) return appState.photos;

    return appState.photos.filter(p => {
        const d = new Date(p.created_at);
        const monthStr = `${d.getFullYear()}年 ${String(d.getMonth() + 1).padStart(2, '0')}月`;
        
        return p.title.toLowerCase().includes(q) || 
               p.author.toLowerCase().includes(q) || 
               monthStr.includes(q);
    });
});

// 岁月模式数据结构 (按年-月分组)
export const groupedTimelinePhotos = computed(() => {
    return filteredPhotos.value.reduce((acc, p) => {
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}年 ${String(d.getMonth() + 1).padStart(2, '0')}月`;
        (acc[key] ??= []).push(p);
        return acc;
    }, {});
});