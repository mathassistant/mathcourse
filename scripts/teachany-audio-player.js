/**
 * TeachAny Audio Player v1.0
 * 底部连续播放条，与 teachany-tts-narrator.js 配合使用
 * 支持浏览器 Web Speech API 作为无 mp3 时的兜底
 */
(function() {
  'use strict';
  // 音频播放器主要由 teachany-tts-narrator.js 初始化
  // 本文件提供兜底：如果页面无播放列表但有 data-tts-disabled=false，使用 Web Speech
  var narratorDisabled = document.querySelector('script[data-tts-disabled="true"]');
  if (narratorDisabled) return;

  // 尝试从 audio config 读取
  var playlistEl = document.querySelector('[data-teachany-audio-playlist]');
  if (playlistEl) return; // narrator.js 会处理

  // Web Speech 兜底：为带 data-tts 的 section 提供朗读
  if (!window.SpeechSynthesisUtterance) return;

  var sections = document.querySelectorAll('[data-tts]');
  if (!sections.length) return;

  sections.forEach(function(sec) {
    var text = sec.querySelector('h1,h2,h3,p') ? 
      (sec.querySelector('h1')||sec.querySelector('h2')||sec.querySelector('h3')||sec.querySelector('p')).textContent : '';
    if (!text) return;
    sec.classList.add('teachany-narrator-section');
    var btn = document.createElement('button');
    btn.className = 'teachany-narrator-btn';
    btn.textContent = '\uD83D\uDD0A';
    btn.title = '朗读此段';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var u = new SpeechSynthesisUtterance(text.slice(0, 500));
      u.lang = 'zh-CN';
      u.rate = 0.9;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    });
    sec.appendChild(btn);
  });
})();
