/**
 * @file src/utils/core.js
 * @description Core browser helpers and upload bridge
 */
import { hasUploadEndpoint, publicEnv, uploadServiceBase } from './env.js';

export const isClient = typeof window !== 'undefined';

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
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(pattern); 
        }
    } catch(e) {
        if (import.meta.env.DEV) {
            console.warn("📳 触觉引擎调用受限，已安全降级", e);
        }
    } 
};

const buildApiError = async (response, fallbackMessage) => {
    let errorCode = '';

    try {
        const payload = await response.clone().json();
        errorCode = typeof payload?.error === 'string' ? payload.error : '';
    } catch (_error) {
        errorCode = '';
    }

    const error = new Error(errorCode ? `${fallbackMessage} (${errorCode})` : fallbackMessage);
    error.status = response.status;
    error.code = errorCode;
    return error;
};

export const uploadMemory = async ({ file, title, author }) => {
    if (!hasUploadEndpoint) {
        throw new Error('Missing PUBLIC_UPLOAD_ENDPOINT.');
    }

    const formData = new FormData();
    formData.append('file', file, file.name || 'shiguang-memory.webp');
    formData.append('title', title);
    formData.append('author', author);

    const response = await fetch(publicEnv.uploadEndpoint, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw await buildApiError(response, `Upload failed with status ${response.status}.`);
    }

    const payload = await response.json();
    if (!payload?.photo) {
        throw new Error('Upload endpoint did not return a photo record.');
    }

    return payload.photo;
};

export const postComment = async ({ photoId, nickname, content }) => {
    if (!hasUploadEndpoint) {
        throw new Error('Missing PUBLIC_UPLOAD_ENDPOINT.');
    }

    const response = await fetch(`${uploadServiceBase}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            photoId,
            nickname,
            content,
        }),
    });

    if (!response.ok) {
        throw await buildApiError(response, `Comment failed with status ${response.status}.`);
    }

    const payload = await response.json();
    if (!payload?.comment) {
        throw new Error('Comment endpoint did not return a comment record.');
    }

    return payload.comment;
};

export const incrementLike = async ({ photoId }) => {
    if (!hasUploadEndpoint) {
        throw new Error('Missing PUBLIC_UPLOAD_ENDPOINT.');
    }

    const response = await fetch(`${uploadServiceBase}/photos/${photoId}/like`, {
        method: 'POST',
    });

    if (!response.ok) {
        throw await buildApiError(response, `Like failed with status ${response.status}.`);
    }

    const payload = await response.json();
    if (typeof payload?.likes !== 'number') {
        throw new Error('Like endpoint did not return the updated like count.');
    }

    return payload.likes;
};
