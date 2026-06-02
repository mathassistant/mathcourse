/**
 * TeachAny TTS Narrator v2.1 — 沉浸式随动播放 + 音画精确同步
 * 滚动自动播放、随时暂停/续播、回退重播、进度条拖动、当前模块高亮
 * NEW: 音频播放时间驱动 Canvas 动画步骤精确同步
 */
(function() {
  'use strict';

  // ── 读取播放列表 ──
  var playlistEl = document.querySelector('[data-teachany-audio-playlist]');
  var playlist = [];
  if (playlistEl) {
    try { playlist = JSON.parse(playlistEl.textContent || '[]'); } catch(e) {}
  }
  if (!playlist.length) return;

  // ── 建立 id→track 映射 & 查找 sections ──
  var trackMap = {};
  playlist.forEach(function(t) { trackMap[t.id] = t; });

  var sections = document.querySelectorAll('[data-tts]');
  var orderedTracks = [];

  sections.forEach(function(sec) {
    var ttsId = sec.getAttribute('data-tts');
    if (!ttsId) return;
    var track = trackMap[ttsId];
    if (!track) return;
    if (orderedTracks.some(function(t) { return t.id === track.id; })) return;
    track._el = sec;
    orderedTracks.push(track);
    sec.classList.add('teachany-narrator-section');
  });

  if (!orderedTracks.length) return;

  // ═══════════════════════════════════════════════
  //  TeachAnySync — 音画同步桥接对象
  // ═══════════════════════════════════════════════
  window.TeachAnySync = {
    _canvases: {},
    _brokenSyncs: {},  // canvasId → true (用户手动操作后断开同步)

    /** 注册一个 Canvas 用于音频同步控制 */
    register: function(canvasId, handlers) {
      this._canvases[canvasId] = handlers;
    },

    /** 取消注册 */
    unregister: function(canvasId) {
      delete this._canvases[canvasId];
      delete this._brokenSyncs[canvasId];
    },

    /** 音频驱动：设置动画到指定步骤 */
    setStep: function(canvasId, step) {
      if (this._brokenSyncs[canvasId]) return; // 用户已断开同步
      var h = this._canvases[canvasId];
      if (h && h.setStep) h.setStep(step);
    },

    /** 音频驱动：重置动画 */
    reset: function(canvasId) {
      if (this._brokenSyncs[canvasId]) return;
      var h = this._canvases[canvasId];
      if (h && h.reset) h.reset();
    },

    /** 音频驱动：执行自定义动作 */
    doAction: function(canvasId, action) {
      if (this._brokenSyncs[canvasId]) return;
      var h = this._canvases[canvasId];
      if (h && h.doAction) h.doAction(action);
    },

    /** 用户手动操作了 Canvas → 断开音频同步 */
    breakSync: function(canvasId) {
      this._brokenSyncs[canvasId] = true;
    },

    /** 恢复同步 */
    restoreSync: function(canvasId) {
      delete this._brokenSyncs[canvasId];
    },

    /** 通知音频系统：用户操作了 Canvas（由 Canvas 调用） */
    notifyManualInteraction: function(canvasId) {
      this.breakSync(canvasId);
      // 触发全局事件
      var evt = new CustomEvent('teachany-canvas-manual', { detail: { canvasId: canvasId } });
      document.dispatchEvent(evt);
    }
  };

  // ═══════════════════════════════════════════════
  //  底部播放条
  // ═══════════════════════════════════════════════
  var bar = document.createElement('div');
  bar.className = 'teachany-audio-bar';
  bar.innerHTML =
    '<div class="ta-bar-left">' +
      '<button class="ta-bar-btn" id="ta-prev-btn" title="上一段">&#9198;</button>' +
      '<button class="ta-bar-btn ta-bar-play" id="ta-play-btn" title="播放">&#9654;</button>' +
      '<button class="ta-bar-btn" id="ta-next-btn" title="下一段">&#9199;</button>' +
    '</div>' +
    '<div class="ta-bar-center">' +
      '<span class="ta-bar-label" id="ta-bar-label"></span>' +
      '<div class="ta-bar-progress" id="ta-bar-progress">' +
        '<div class="ta-bar-progress-fill" id="ta-bar-fill"></div>' +
        '<div class="ta-bar-progress-thumb" id="ta-bar-thumb"></div>' +
      '</div>' +
      '<span class="ta-bar-time" id="ta-bar-time">00:00 / 00:00</span>' +
    '</div>' +
    '<div class="ta-bar-right">' +
      '<button class="ta-bar-btn ta-bar-mode" id="ta-mode-btn" title="自动播放模式">&#128260;</button>' +
    '</div>';
  document.body.appendChild(bar);

  // ── 状态 ──
  var audio = new Audio();
  var currentIdx = -1;
  var isPlaying = false;
  var userPaused = false;
  var scrollLock = false;
  var scrollTimer = null;
  var autoMode = true;
  var playedSet = {};
  var lastManualIdx = -1;

  // ── 同步状态 ──
  var syncState = {};  // trackId → { stepDuration, totalSteps, lastStep, canvasId, type, events, lastEventIdx }

  // ── UI 引用 ──
  var playBtn = document.getElementById('ta-play-btn');
  var prevBtn = document.getElementById('ta-prev-btn');
  var nextBtn = document.getElementById('ta-next-btn');
  var modeBtn = document.getElementById('ta-mode-btn');
  var labelEl = document.getElementById('ta-bar-label');
  var fillEl = document.getElementById('ta-bar-fill');
  var thumbEl = document.getElementById('ta-bar-thumb');
  var timeEl = document.getElementById('ta-bar-time');
  var progressBar = document.getElementById('ta-bar-progress');

  // ── 工具函数 ──
  function formatTime(s) {
    if (isNaN(s) || !isFinite(s)) s = 0;
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function showBar() { bar.classList.add('visible'); }
  function hideBar() { bar.classList.remove('visible'); }

  function updatePlayBtn() {
    playBtn.innerHTML = isPlaying ? '&#9208;' : '&#9654;';
  }

  function updateModeBtn() {
    modeBtn.innerHTML = autoMode ? '&#128260;' : '&#128264;';
    modeBtn.title = autoMode ? '自动播放：滚动到模块自动讲解' : '手动模式：点击播放按钮开始';
    modeBtn.style.opacity = autoMode ? '1' : '0.4';
  }

  // ── Section 高亮 ──
  function highlightSection(idx) {
    orderedTracks.forEach(function(t, i) {
      if (t._el) {
        if (i === idx && isPlaying) {
          t._el.classList.add('teachany-section-active');
        } else {
          t._el.classList.remove('teachany-section-active');
        }
      }
    });
  }

  function clearAllHighlights() {
    orderedTracks.forEach(function(t) {
      if (t._el) t._el.classList.remove('teachany-section-active');
    });
  }

  function updateSectionBtns(activeIdx) {
    orderedTracks.forEach(function(t, i) {
      if (!t._el) return;
      var btn = t._el.querySelector('.teachany-narrator-btn');
      if (!btn) return;
      if (i === activeIdx && isPlaying) {
        btn.classList.add('playing');
        btn.innerHTML = '&#9208;';
      } else {
        btn.classList.remove('playing');
        btn.innerHTML = '&#9654;';
      }
    });
  }

  // ═══════════════════════════════════════════════
  //  同步引擎
  // ═══════════════════════════════════════════════

  /** 为当前 track 初始化同步状态 */
  function initSyncForTrack(track) {
    var sc = track.syncConfig;
    if (!sc) return;

    var state = {
      type: sc.type || 'canvas-step',
      canvasId: sc.canvasId,
      lastStep: -1,
      lastEventIdx: -1
    };

    if (sc.type === 'canvas-step') {
      state.totalSteps = sc.totalSteps || 10;
      state.stepDuration = 0; // 将在 loadedmetadata 中计算
    } else if (sc.type === 'timeline-events') {
      state.events = sc.events || [];
      state.events.sort(function(a, b) { return a.t - b.t; });
    }

    syncState[track.id] = state;
    // 恢复该 Canvas 的同步（可能之前被手动操作断开）
    window.TeachAnySync.restoreSync(sc.canvasId);
  }

  /** 在 audio loadedmetadata 后计算 stepDuration */
  function calcSyncDurations() {
    var track = orderedTracks[currentIdx];
    if (!track) return;
    var state = syncState[track.id];
    if (!state) return;
    if (state.type !== 'canvas-step') return;
    if (!audio.duration || !isFinite(audio.duration)) return;

    state.stepDuration = audio.duration / state.totalSteps;
    state.lastStep = -1;
  }

  /** timeupdate 时检查并触发同步 */
  function handleSyncTick() {
    if (!isPlaying) return;
    var track = orderedTracks[currentIdx];
    if (!track) return;
    var state = syncState[track.id];
    if (!state) return;
    if (!audio.duration || !isFinite(audio.duration)) return;

    if (state.type === 'canvas-step') {
      if (state.stepDuration <= 0) return;
      var targetStep = Math.floor(audio.currentTime / state.stepDuration);
      targetStep = Math.max(0, Math.min(state.totalSteps, targetStep));
      if (targetStep !== state.lastStep) {
        state.lastStep = targetStep;
        window.TeachAnySync.setStep(state.canvasId, targetStep);
      }
    } else if (state.type === 'timeline-events') {
      var ct = audio.currentTime;
      for (var i = state.lastEventIdx + 1; i < state.events.length; i++) {
        if (ct >= state.events[i].t) {
          state.lastEventIdx = i;
          window.TeachAnySync.doAction(state.canvasId, state.events[i].action);
        } else {
          break;
        }
      }
    }
  }

  /** 清理当前 track 的同步状态 */
  function cleanupSyncForTrack(track) {
    if (!track) return;
    delete syncState[track.id];
  }

  // ═══════════════════════════════════════════════
  //  音频加载 & 播放
  // ═══════════════════════════════════════════════
  function loadTrack(idx) {
    if (idx < 0 || idx >= orderedTracks.length) return;
    var oldTrack = orderedTracks[currentIdx];
    if (oldTrack) cleanupSyncForTrack(oldTrack);

    var track = orderedTracks[idx];
    audio.src = track.src;
    audio.load();
    labelEl.textContent = track.label || '';
    fillEl.style.width = '0%';
    thumbEl.style.left = '0%';
    timeEl.textContent = '00:00 / 00:00';
    currentIdx = idx;
    playedSet[track.id] = true;

    // 初始化同步
    initSyncForTrack(track);

    // 重置对应的 Canvas 动画
    if (track.syncConfig && track.syncConfig.canvasId) {
      window.TeachAnySync.reset(track.syncConfig.canvasId);
    }
  }

  function playTrack(idx) {
    if (idx < 0 || idx >= orderedTracks.length) return;
    loadTrack(idx);
    userPaused = false;
    lastManualIdx = idx;

    audio.play().then(function() {
      isPlaying = true;
      updatePlayBtn();
      updateSectionBtns(idx);
      highlightSection(idx);
      showBar();
    }).catch(function(e) {
      console.warn('TeachAny TTS: play failed', e);
    });
  }

  function togglePlay() {
    if (currentIdx < 0) { playTrack(0); return; }
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      userPaused = true;
      lastManualIdx = currentIdx;
      clearAllHighlights();
    } else {
      userPaused = false;
      lastManualIdx = currentIdx;
      audio.play().then(function() {
        isPlaying = true;
        highlightSection(currentIdx);
      }).catch(function(){});
    }
    updatePlayBtn();
    updateSectionBtns(currentIdx);
  }

  function playNext() {
    userPaused = false;
    if (currentIdx < orderedTracks.length - 1) {
      var nextIdx = currentIdx + 1;
      playTrack(nextIdx);
      scrollToSection(nextIdx);
    } else {
      audio.pause();
      isPlaying = false;
      updatePlayBtn();
      updateSectionBtns(-1);
      clearAllHighlights();
    }
  }

  function playPrev() {
    userPaused = false;
    if (currentIdx > 0) {
      var prevIdx = currentIdx - 1;
      playTrack(prevIdx);
      scrollToSection(prevIdx);
    } else if (currentIdx === 0) {
      audio.currentTime = 0;
      playTrack(0);
    }
  }

  function scrollToSection(idx) {
    if (idx < 0 || idx >= orderedTracks.length) return;
    var el = orderedTracks[idx]._el;
    if (!el) return;
    scrollLock = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function() { scrollLock = false; }, 900);
  }

  // ═══════════════════════════════════════════════
  //  进度条拖动
  // ═══════════════════════════════════════════════
  var isDragging = false;

  function seekTo(e) {
    if (!audio.duration || !isFinite(audio.duration)) return;
    var rect = progressBar.getBoundingClientRect();
    var pct = (e.clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    audio.currentTime = pct * audio.duration;
    fillEl.style.width = (pct * 100) + '%';
    thumbEl.style.left = (pct * 100) + '%';
    timeEl.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
    // 拖动后立即重新计算同步
    handleSyncTick();
  }

  progressBar.addEventListener('mousedown', function(e) {
    isDragging = true;
    seekTo(e);
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    seekTo(e);
  });

  document.addEventListener('mouseup', function() {
    isDragging = false;
  });

  progressBar.addEventListener('touchstart', function(e) {
    isDragging = true;
    seekTo(e.touches[0]);
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    seekTo(e.touches[0]);
  }, { passive: false });

  document.addEventListener('touchend', function() {
    isDragging = false;
  });

  // ═══════════════════════════════════════════════
  //  Audio 事件
  // ═══════════════════════════════════════════════
  audio.addEventListener('loadedmetadata', function() {
    timeEl.textContent = '00:00 / ' + formatTime(audio.duration);
    calcSyncDurations();
  });

  audio.addEventListener('timeupdate', function() {
    if (!audio.duration || !isFinite(audio.duration)) return;
    var pct = (audio.currentTime / audio.duration) * 100;
    fillEl.style.width = pct + '%';
    thumbEl.style.left = pct + '%';
    timeEl.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
    handleSyncTick();
  });

  audio.addEventListener('ended', function() {
    isPlaying = false;
    updatePlayBtn();
    updateSectionBtns(-1);
    clearAllHighlights();
    fillEl.style.width = '100%';
    thumbEl.style.left = '100%';
    timeEl.textContent = formatTime(audio.duration) + ' / ' + formatTime(audio.duration);

    // 清理同步
    var track = orderedTracks[currentIdx];
    if (track) cleanupSyncForTrack(track);

    // 自动播放下一段
    if (autoMode && currentIdx < orderedTracks.length - 1) {
      setTimeout(function() {
        playNext();
      }, 600);
    }
  });

  audio.addEventListener('pause', function() {
    // 不做额外处理，由 togglePlay/playTrack 控制
  });

  audio.addEventListener('error', function() {
    isPlaying = false;
    updatePlayBtn();
    updateSectionBtns(-1);
    clearAllHighlights();
    var track = orderedTracks[currentIdx];
    if (track) cleanupSyncForTrack(track);
  });

  // ═══════════════════════════════════════════════
  //  监听 Canvas 手动操作事件（断开同步）
  // ═══════════════════════════════════════════════
  document.addEventListener('teachany-canvas-manual', function(e) {
    // Canvas 被用户手动操作 → 不打断音频，但断开动画同步
    // 更新 UI：在 section 中显示"手动模式"提示
    var canvasId = e.detail.canvasId;
    for (var i = 0; i < orderedTracks.length; i++) {
      var t = orderedTracks[i];
      if (t.syncConfig && t.syncConfig.canvasId === canvasId && t._el) {
        // 在 section 上添加手动模式标记
        t._el.setAttribute('data-sync-broken', 'true');
        break;
      }
    }
  });

  // ═══════════════════════════════════════════════
  //  滚动自动播放 (IntersectionObserver)
  // ═══════════════════════════════════════════════
  var observerOptions = {
    root: null,
    rootMargin: '-15% 0px -15% 0px',
    threshold: 0.3
  };

  var observer = new IntersectionObserver(function(entries) {
    if (!autoMode) return;
    if (scrollLock) return;
    if (userPaused) return;
    if (isDragging) return;

    var bestIdx = -1;
    var bestTop = Infinity;

    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      for (var i = 0; i < orderedTracks.length; i++) {
        if (orderedTracks[i]._el === entry.target) {
          if (i < bestTop || bestIdx < 0) {
            bestIdx = i;
            bestTop = i;
          }
          break;
        }
      }
    });

    if (bestIdx < 0) return;
    if (bestIdx === currentIdx && isPlaying) return;

    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function() {
      if (!autoMode || scrollLock || userPaused || isDragging) return;
      if (bestIdx === currentIdx && isPlaying) return;
      playTrack(bestIdx);
    }, 400);
  }, observerOptions);

  orderedTracks.forEach(function(t) {
    if (t._el) observer.observe(t._el);
  });

  // ═══════════════════════════════════════════════
  //  Section 播放按钮注入
  // ═══════════════════════════════════════════════
  orderedTracks.forEach(function(track, idx) {
    var el = track._el;
    if (!el) return;
    var btn = document.createElement('button');
    btn.className = 'teachany-narrator-btn';
    btn.innerHTML = '&#9654;';
    btn.title = '播放：' + (track.label || '');
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (currentIdx === idx && isPlaying) {
        togglePlay();
      } else {
        userPaused = false;
        lastManualIdx = idx;
        playTrack(idx);
      }
    });
    el.appendChild(btn);
  });

  // ═══════════════════════════════════════════════
  //  底部按钮事件
  // ═══════════════════════════════════════════════
  playBtn.addEventListener('click', function() {
    userPaused = !isPlaying;
    togglePlay();
  });

  nextBtn.addEventListener('click', playNext);
  prevBtn.addEventListener('click', playPrev);

  modeBtn.addEventListener('click', function() {
    autoMode = !autoMode;
    updateModeBtn();
    if (!autoMode) {
      if (isPlaying) {
        userPaused = true;
        audio.pause();
        isPlaying = false;
        updatePlayBtn();
        updateSectionBtns(-1);
        clearAllHighlights();
      }
    }
  });

  // ── 键盘快捷键 ──
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

    switch(e.key) {
      case ' ':
        e.preventDefault();
        userPaused = !isPlaying;
        togglePlay();
        break;
      case 'ArrowRight':
        if (e.shiftKey) {
          e.preventDefault();
          playNext();
        }
        break;
      case 'ArrowLeft':
        if (e.shiftKey) {
          e.preventDefault();
          playPrev();
        }
        break;
      case 'm':
        if (!e.ctrlKey && !e.metaKey) {
          autoMode = !autoMode;
          updateModeBtn();
        }
        break;
    }
  });

  // ═══════════════════════════════════════════════
  //  初始化
  // ═══════════════════════════════════════════════
  if (orderedTracks.length > 0) {
    loadTrack(0);
    showBar();
    updateModeBtn();
  }
})();
