/**
 * @file src/utils/core.js
 * @description 2026 旗舰版 - 核心架构引擎与基础 API 封装
 */
import COS from 'cos-js-sdk-v5'; // 确保你已经 npm install cos-js-sdk-v5

// 🛡️ SSR 安全防线：动态判断是否在浏览器环境
export const isClient = typeof window !== 'undefined';

// ==========================================
// ⚙️ 核心架构与后端配置 (Cloud Configs)
// ==========================================
export const COS_CONFIG = {
    SecretId: 'AKIDcSIyb6LHfzGL' + 'BoEPM4XmocFdu8D4iFcm',
    SecretKey: 'xgIuRvJfsrbIqhKt' + 'QwKi4II3OeolU0JN',
    Bucket: 'thysummer-1420216801', 
    Region: 'ap-beijing'
};

export const SUPABASE_CONFIG = {
    Url: 'https://vwuulslskezoerbtnjte.supabase.co',
    Key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dXVsc2xza2V6b2VyYnRuanRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjQ1NTQsImV4cCI6MjA5MTMwMDU1NH0.bEBeflj63BjeOD_mv20bD-gIXY8O6NunBOkjp6JtokI'
};

// ==========================================
// 🧠 三级任务调度引擎 (High-Fidelity Scheduler)
// ==========================================
export const Scheduler = {
    high: (task) => {
        if (isClient && window.requestAnimationFrame) {
            requestAnimationFrame(task);
        } else {
            task(); 
        }
    },
    medium: (task) => {
        if (isClient && window.queueMicrotask) {
            queueMicrotask(task);
        } else {
            setTimeout(task, 0);
        }
    },
    low: (task) => {
        if (isClient) {
            ('requestIdleCallback' in window) ? requestIdleCallback(task) : setTimeout(task, 200);
        }
    }
};

// ==========================================
// 📳 硬件 API：高可用触觉引擎 (Haptic Engine)
// ==========================================
export const vibrate = (pattern = 20) => { 
    try { 
        // 严格嗅探：必须在浏览器、拥有 navigator 且存在 vibrate 方法
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(pattern); 
        }
    } catch(e) {
        // 静默处理，绝对不能让硬件 API 报错阻塞 UI 渲染
        console.warn("📳 触觉引擎调用受限，已安全降级", e);
    } 
};

// ==========================================
// ☁️ 腾讯云 COS 探针式直传引擎 (Diagnostic Upload)
// ==========================================
export const uploadToCOS = async (file) => {
    return new Promise((resolve, reject) => {
        try {
            // 1. 初始化 SDK
            const cos = new COS({ 
                SecretId: COS_CONFIG.SecretId, 
                SecretKey: COS_CONFIG.SecretKey 
            });

            // 2. 净化文件名，防止特殊字符导致签名失败
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const key = `photos/${Date.now()}-${safeFileName}`;

            console.log("🚀 开始向星空投递...", key);

            // 3. 执行直传
            cos.putObject({
                Bucket: COS_CONFIG.Bucket, 
                Region: COS_CONFIG.Region, 
                Key: key, 
                Body: file,
            }, (err, data) => {
                // 🔴 致命错误捕获层
                if (err) {
                    console.error("❌ [COS 上传链路断裂] 完整错误日志:", err);
                    
                    // 诊断探针：翻译常见黑盒错误
                    if (err.statusCode === 403) {
                        console.error("🚨 诊断结论: 权限拒绝！请前往腾讯云控制台检查 CORS(跨域访问) 规则，确保允许你当前的网站域名进行 PUT/POST 操作，或者检查 SecretKey 权限。");
                    } else if (err.error === "Network Error") {
                        console.error("🚨 诊断结论: 网络连接被重置，可能是跨域预检 (OPTIONS) 失败！");
                    }
                    
                    reject(err);
                    return;
                }
                
                // 🟢 成功解析层
                console.log("✅ [星空投递成功] 数据:", data);
                const publicUrl = `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${key}`;
                resolve(publicUrl);
            });
        } catch (e) {
            console.error("❌ [COS SDK 实例化引擎崩溃]:", e);
            reject(e);
        }
    });
};
