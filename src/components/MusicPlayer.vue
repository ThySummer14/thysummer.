<script setup>
import { ref } from 'vue';
import { vibrate } from '../utils/core.js';

const isPlaying = ref(false);
const audioRef = ref(null);

const toggleMusic = () => {
  vibrate(10);
  if (!audioRef.value) return;

  if (isPlaying.value) {
    audioRef.value.pause();
    isPlaying.value = false;
  } else {
    audioRef.value.play()
      .then(() => {
        isPlaying.value = true;
      })
      .catch(() => {
        if (typeof window !== 'undefined' && window.showToast) {
          window.showToast('需先轻触页面唤醒音频机制', 'error');
        }
      });
  }
};
</script>

<template>
  <div class="music-container">
    <audio ref="audioRef" loop src="/xvni.mp3" preload="auto"></audio>
    
    <div 
      class="music-disk" 
      :class="{ 'playing': isPlaying }" 
      @click="toggleMusic"
      title="轻触播放音乐"
    ></div>
  </div>
</template>

<style scoped>
.music-disk {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1000;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
  background: conic-gradient(#111, #333, #111, #333, #111);
  border: 3px solid rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: diskSpin 5s linear infinite;
  animation-play-state: paused;
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.8s ease;
  will-change: transform, filter;
}

.music-disk::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  background: #8CA192;
  border-radius: 50%;
  border: 2px solid #fff;
  z-index: 2;
}

.music-disk::after {
  content: '';
  position: absolute;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
}

.music-disk.playing { 
  animation-play-state: running; 
  filter: drop-shadow(0 0 12px rgba(140, 161, 146, 0.6)); 
}

.music-disk:active { 
  transform: scale(0.9); 
}

@keyframes diskSpin { 
  to { transform: rotate(360deg); } 
}
</style>