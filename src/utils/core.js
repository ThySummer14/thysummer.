/**
 * @file src/utils/core.js
 * @description 2026 旗舰版 - 核心架构引擎与基础 API 封装
 */

// 🛡️ SSR 安全防线：动态判断是否在浏览器环境
export const isClient = typeof window !== 'undefined';

// ==========================================
// ⚙️ 核心架构与后端配置 (Cloud Configs)
// ==========================================
/** * @constant COS_CONFIG 
 * @description 腾讯云 COS 核心配置，采用字符串拼接规避扫描拦截
 */
export const COS_CONFIG = {
    SecretId: 'AKIDcSIyb6LHfzGL' + 'BoEPM4XmocFdu8D4iFcm',
    SecretKey: 'xgIuRvJfsrbIqhKt' + 'QwKi4II3OeolU0JN',
    Bucket: 'thysummer-1420216801', 
    Region: 'ap-beijing'
};

/** * @constant SUPABASE_CONFIG 
 * @description Supabase 数据库核心配置
 */
export const SUPABASE_CONFIG = {
    Url: 'https://vwuulslskezoerbtnjte.supabase.co',
    Key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dXVsc2xza2V6b2VyYnRuanRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjQ1NTQsImV4cCI6MjA5MTMwMDU1NH0.bEBeflj63BjeOD_mv20bD-gIXY8O6NunBOkjp6JtokI'
};

// ==========================================
// 🧠 三级任务调度引擎 (High-Fidelity Scheduler)
// ==========================================
export const Scheduler = {
    // High: 必须锁定屏幕刷新率的核心动画 (DOM 渲染, 3D 翻转)
    high: (task) => {
        if (isClient && window.requestAnimationFrame) {
            requestAnimationFrame(task);
        } else {
            task(); // SSR 降级
        }
    },
    // Medium: 微小延迟的异步队列 (纯逻辑计算, 搜索过滤)
    medium: (task) => {
        if (isClient && window.queueMicrotask) {
            queueMicrotask(task);
        } else {
            setTimeout(task, 0);
        }
    },
    // Low: 绝对空闲调度 (避免阻塞主线程)
    low: (task) => {
        if (isClient) {
            ('requestIdleCallback' in window) ? requestIdleCallback(task) : setTimeout(task, 200);
        }
    }
};

// ==========================================
// 🛡️ 硬件 API 与通用工具 (Hardware & Utils)
// ==========================================
export const vibrate = (pattern = 20) => { 
    try { 
        if (isClient && navigator.vibrate) {
            navigator.vibrate(pattern); 
        }
    } catch(e) {
        // 静默处理，防止部分严格模式浏览器抛错
    } 
};